package orchestrator

import (
	"fmt"
	"log"
	"sync"

	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/parser"
	"github.com/conductor/fleet-commander/internal/registry"
)

// Orchestrator manages the run lifecycle for projects.
type TaskExecutor interface {
	ExecuteTask(projectID, taskID, taskDescription, descriptionPrompt, specContent string, agentTag string) error
}

type Orchestrator struct {
	pm       *registry.ProjectManager
	executor TaskExecutor
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

	task := GetBestTask(project)
	if task == nil {
		return fmt.Errorf("no tasks available for project %s", projectID)
	}

	log.Printf("Dispatching task: %s (agent: %s)", task.Description, task.AgentTag)

	if o.executor != nil {
		if err := o.executor.ExecuteTask(projectID, task.ID, task.Description, "", "", task.AgentTag); err != nil {
			return fmt.Errorf("executor failed: %w", err)
		}
	}

	task.Status = models.StatusDone

	// Persist to plan.md
	if err := persistTaskStatus(project, task); err != nil {
		log.Printf("Warning: failed to persist task status: %v", err)
	}

	o.pm.UpdateProject(project)
	return nil
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
