package orchestrator

import (
	"context"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"github.com/conductor/fleet-commander/internal/issues"
	"github.com/conductor/fleet-commander/internal/logs"
	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/parser"
	"github.com/conductor/fleet-commander/internal/registry"
	"github.com/conductor/fleet-commander/internal/review"
)

// TaskExecutor dispatches a task and returns a channel for the result.
type TaskExecutor interface {
	ExecuteTask(projectID, taskID, taskDescription, descriptionPrompt, specContent string, agentTag string) (<-chan *models.ExecutionResult, error)
}

// TaskSelector returns the best task for a project, or nil if none available.
type TaskSelector interface {
	SelectTask(projectID string, project *models.Project) (*models.Task, float64, string)
}

// LogSink accepts log entries for persistence.
type LogSink interface {
	Write(entry *logs.LogEntry) error
}

// StatusBroadcaster sends execution status events to connected clients.
type StatusBroadcaster interface {
	Broadcast(projectID string, message any)
}

// IssueStore persists issues.
type IssueStore interface {
	Save(issue *issues.Issue) error
}

// ReviewRunner executes the review pipeline for a project.
type ReviewRunner interface {
	Run(ctx context.Context, projectRoot string) ([]review.CheckResult, error)
}

// Orchestrator manages the run lifecycle for projects.
type Orchestrator struct {
	pm           *registry.ProjectManager
	executor     TaskExecutor
	selector     TaskSelector
	logger       LogSink
	broadcaster  StatusBroadcaster
	issueStore   IssueStore
	reviewRunner ReviewRunner
	mu           sync.Mutex
	running      map[string]bool
	maxRetries   int
	baseDelay    time.Duration
	maxDelay     time.Duration
}

func New(pm *registry.ProjectManager, opts ...OrchestratorOption) *Orchestrator {
	o := &Orchestrator{
		pm:         pm,
		running:    make(map[string]bool),
		maxRetries: 3,
		baseDelay:  5 * time.Second,
		maxDelay:   60 * time.Second,
	}
	for _, opt := range opts {
		opt(o)
	}
	return o
}

type OrchestratorOption func(*Orchestrator)

func WithExecutor(executor TaskExecutor) OrchestratorOption {
	return func(o *Orchestrator) {
		o.executor = executor
	}
}

func WithLogger(logger LogSink) OrchestratorOption {
	return func(o *Orchestrator) {
		o.logger = logger
	}
}

func WithTaskSelector(selector TaskSelector) OrchestratorOption {
	return func(o *Orchestrator) {
		o.selector = selector
	}
}

func WithStatusBroadcaster(b StatusBroadcaster) OrchestratorOption {
	return func(o *Orchestrator) {
		o.broadcaster = b
	}
}

func WithIssueStore(store IssueStore) OrchestratorOption {
	return func(o *Orchestrator) {
		o.issueStore = store
	}
}

func WithReviewRunner(runner ReviewRunner) OrchestratorOption {
	return func(o *Orchestrator) {
		o.reviewRunner = runner
	}
}

func WithRetryConfig(maxRetries int, baseDelay, maxDelay time.Duration) OrchestratorOption {
	return func(o *Orchestrator) {
		o.maxRetries = maxRetries
		o.baseDelay = baseDelay
		o.maxDelay = maxDelay
	}
}

// Run executes the orchestrator lifecycle for a project with retry logic,
// failure detection, auto-blocker creation, and status broadcasting.
func (o *Orchestrator) Run(projectID string) error {
	o.mu.Lock()
	if o.running[projectID] {
		o.mu.Unlock()
		return fmt.Errorf("orchestrator already running for project %s", projectID)
	}
	o.running[projectID] = true
	o.mu.Unlock()

	defer func() {
		o.mu.Lock()
		delete(o.running, projectID)
		o.mu.Unlock()
	}()

	project, exists := o.pm.GetProject(projectID)
	if !exists {
		return fmt.Errorf("project not found: %s", projectID)
	}

	var task *models.Task
	var score float64

	if o.selector != nil {
		var rationale string
		task, score, rationale = o.selector.SelectTask(projectID, project)
		if task != nil {
			log.Printf("Dispatcher selected task %s (score: %.1f, reason: %s)", task.ID, score, rationale)
		}
	} else {
		task = GetBestTask(project)
		if task != nil {
			score = float64(ScoreTask(task))
		}
	}

	if task == nil {
		return fmt.Errorf("no tasks available for project %s", projectID)
	}

	log.Printf("Dispatching task: %s (agent: %s)", task.Description, task.AgentTag)

	o.writeLog(logs.TypeDispatch, projectID, logs.DispatchData{
		TaskID:    task.ID,
		TaskTitle: task.Description,
		AgentTag:  task.AgentTag,
		Score:     score,
		TaskCount: countTodoTasks(project),
	})

	startTime := time.Now()

	if o.executor == nil {
		// No executor — mark done immediately (backward compat)
		task.Status = models.StatusDone
		if err := persistTaskStatus(project, task); err != nil {
			log.Printf("Warning: failed to persist task status: %v", err)
		}
		o.pm.UpdateProject(project)
		return nil
	}

	// Retry loop with exponential backoff
	var lastResult *models.ExecutionResult
	for attempt := 0; attempt <= o.maxRetries; attempt++ {
		if attempt > 0 {
			delay := o.backoffDelay(attempt)
			log.Printf("Retrying task %s (attempt %d/%d, delay %v)", task.ID, attempt, o.maxRetries, delay)
			o.broadcastStatus(projectID, task.ID, "retrying", map[string]any{
				"attempt":    attempt,
				"maxRetries": o.maxRetries,
				"delayMs":    delay.Milliseconds(),
			})
			time.Sleep(delay)
		}

		o.broadcastStatus(projectID, task.ID, "running", nil)

		taskDescription := InjectIssueTemplate(task.Description)
		resultCh, err := o.executor.ExecuteTask(projectID, task.ID, taskDescription, "", "", task.AgentTag)
		if err != nil {
			o.writeLog(logs.TypeError, projectID, logs.CompletionData{
				TaskID:       task.ID,
				Status:       "error",
				DurationMs:   time.Since(startTime).Milliseconds(),
				ErrorMessage: err.Error(),
			})
			return fmt.Errorf("executor failed: %w", err)
		}

		if resultCh == nil {
			continue
		}

		lastResult = <-resultCh

		if lastResult != nil && lastResult.Status == "succeeded" {
			log.Printf("Task %s completed successfully (attempt %d, duration: %dms)", task.ID, attempt+1, lastResult.Duration)
			break
		}

		// Execution failed
		errMsg := "execution failed"
		if lastResult != nil && lastResult.Error != "" {
			errMsg = lastResult.Error
		}
		log.Printf("Task %s failed (attempt %d/%d): %s", task.ID, attempt+1, o.maxRetries+1, errMsg)

		o.writeLog(logs.TypeCompletion, projectID, logs.CompletionData{
			TaskID:       task.ID,
			Status:       "failed",
			DurationMs:   time.Since(startTime).Milliseconds(),
			ErrorMessage: errMsg,
		})

		// Last attempt exhausted — create blocker
		if attempt == o.maxRetries {
			o.broadcastStatus(projectID, task.ID, "failed", map[string]any{
				"error":       errMsg,
				"attempts":    attempt + 1,
				"failureType": string(lastResult.FailureType),
			})
			o.createBlockerIssue(projectID, task, lastResult, attempt+1)
			return fmt.Errorf("task execution failed after %d attempts: %s", attempt+1, errMsg)
		}
	}

	// Success path
	if lastResult == nil || lastResult.Status != "succeeded" {
		return fmt.Errorf("task execution produced no result")
	}

	task.Status = models.StatusDone
	duration := time.Since(startTime).Milliseconds()

	o.broadcastStatus(projectID, task.ID, "succeeded", map[string]any{
		"durationMs": duration,
	})

	o.writeLog(logs.TypeCompletion, projectID, logs.CompletionData{
		TaskID:     task.ID,
		Status:     "done",
		DurationMs: duration,
	})

	// Parse and auto-create issues from agent output
	o.createDelegationIssues(projectID, task, lastResult.Output)

	// Run review pipeline if configured
	if o.reviewRunner != nil {
		reviewResults, err := o.reviewRunner.Run(context.Background(), project.Path)
		if err != nil {
			log.Printf("Warning: review pipeline failed for project %s: %v", projectID, err)
			o.writeLog(logs.TypeError, projectID, logs.CompletionData{
				TaskID:       task.ID,
				Status:       "review_error",
				DurationMs:   time.Since(startTime).Milliseconds(),
				ErrorMessage: fmt.Sprintf("review pipeline: %v", err),
			})
		} else if reviewResults != nil {
			o.handleReviewResults(projectID, task, reviewResults)
		}
	}

	if err := persistTaskStatus(project, task); err != nil {
		log.Printf("Warning: failed to persist task status: %v", err)
	}

	// Auto-unblock tasks that depend on this completed task
	unblocked := AutoUnblockDependents(project, task.ID)
	if len(unblocked) > 0 {
		log.Printf("Auto-unblocked tasks: %v", unblocked)
		for _, tid := range unblocked {
			o.broadcastStatus(projectID, tid, "unblocked", nil)
		}
	}

	o.pm.UpdateProject(project)
	return nil
}

// backoffDelay computes exponential backoff: min(baseDelay * 2^attempt, maxDelay).
func (o *Orchestrator) backoffDelay(attempt int) time.Duration {
	delay := float64(o.baseDelay) * math.Pow(2, float64(attempt))
	if delay > float64(o.maxDelay) {
		return o.maxDelay
	}
	return time.Duration(delay)
}

func (o *Orchestrator) writeLog(logType logs.LogType, projectID string, data interface{}) {
	if o.logger == nil {
		return
	}
	entry := logs.NewLogEntry(logType, projectID)
	entry.SetData(data)
	if err := o.logger.Write(entry); err != nil {
		log.Printf("Warning: failed to write log entry: %v", err)
	}
}

func countTodoTasks(project *models.Project) int {
	count := 0
	for _, track := range project.Tracks {
		for _, phase := range track.Phases {
			for _, task := range phase.Tasks {
				if task.Status == models.StatusTodo {
					count++
				}
			}
		}
	}
	return count
}

// persistTaskStatus finds the plan.md path for the task and writes the new status.
func persistTaskStatus(project *models.Project, task *models.Task) error {
	for _, track := range project.Tracks {
		for _, phase := range track.Phases {
			for _, t := range phase.Tasks {
				if t.ID == task.ID {
					if track.PlanPath == "" {
						return fmt.Errorf("track has no plan path")
					}
					// PlanPath may be relative (e.g. ./tracks/foo/), resolve against project path
					planPath := parser.ResolvePlanPath(project.Path, track.PlanPath)
					return parser.WritePlanStatusByID(planPath, task.ID, models.StatusDone)
				}
			}
		}
	}
	return fmt.Errorf("task %s not found in project tracks", task.ID)
}
