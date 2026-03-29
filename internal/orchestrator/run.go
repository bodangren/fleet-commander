package orchestrator

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/conductor/fleet-commander/internal/logs"
	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/parser"
	"github.com/conductor/fleet-commander/internal/registry"
)

// Orchestrator manages the run lifecycle for projects.
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

type Orchestrator struct {
	pm       *registry.ProjectManager
	executor TaskExecutor
	selector TaskSelector
	logger   LogSink
	mu       sync.Mutex
	running  map[string]bool
}

func New(pm *registry.ProjectManager, opts ...OrchestratorOption) *Orchestrator {
	o := &Orchestrator{
		pm:      pm,
		running: make(map[string]bool),
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

// Run executes the orchestrator lifecycle for a project:
// 1. Acquires a per-project mutex lock.
// 2. Calls GetBestTask to find the highest-priority todo task.
// 3. Logs dispatch, waits 2 seconds (mock execution).
// 4. Updates in-memory status to done.
// 5. Persists to plan.md via WritePlanStatus.
// 6. Releases the lock.
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

	if o.executor != nil {
		resultCh, err := o.executor.ExecuteTask(projectID, task.ID, task.Description, "", "", task.AgentTag)
		if err != nil {
			o.writeLog(logs.TypeError, projectID, logs.CompletionData{
				TaskID:       task.ID,
				Status:       "error",
				DurationMs:   time.Since(startTime).Milliseconds(),
				ErrorMessage: err.Error(),
			})
			return fmt.Errorf("executor failed: %w", err)
		}

		// Wait for execution completion
		if resultCh != nil {
			result := <-resultCh
			if result == nil || result.Status == "failed" {
				errMsg := "execution failed"
				if result != nil && result.Error != "" {
					errMsg = result.Error
				}
				o.writeLog(logs.TypeCompletion, projectID, logs.CompletionData{
					TaskID:       task.ID,
					Status:       "failed",
					DurationMs:   time.Since(startTime).Milliseconds(),
					ErrorMessage: errMsg,
				})
				return fmt.Errorf("task execution failed: %s", errMsg)
			}
			log.Printf("Task %s completed successfully (duration: %dms)", task.ID, result.Duration)
		}
	}

	task.Status = models.StatusDone
	duration := time.Since(startTime).Milliseconds()

	o.writeLog(logs.TypeCompletion, projectID, logs.CompletionData{
		TaskID:     task.ID,
		Status:     "done",
		DurationMs: duration,
	})

	// Persist to plan.md
	if err := persistTaskStatus(project, task); err != nil {
		log.Printf("Warning: failed to persist task status: %v", err)
	}

	o.pm.UpdateProject(project)
	return nil
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
