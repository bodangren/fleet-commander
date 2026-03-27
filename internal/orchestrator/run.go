package orchestrator

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/parser"
	"github.com/conductor/fleet-commander/internal/registry"
)

// Orchestrator manages the run lifecycle for projects.
type Orchestrator struct {
	pm      *registry.ProjectManager
	mu      sync.Mutex
	running map[string]bool
}

// New creates a new Orchestrator backed by the given ProjectManager.
func New(pm *registry.ProjectManager) *Orchestrator {
	return &Orchestrator{
		pm:      pm,
		running: make(map[string]bool),
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

	log.Printf("Dispatching task: %s", task.Description)

	// Mock execution: wait 2 seconds
	time.Sleep(2 * time.Second)

	// Update in-memory status
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
					planPath := resolvePlanPath(project.Path, track.PlanPath)
					return parser.WritePlanStatus(planPath, task.Description, models.StatusDone)
				}
			}
		}
	}
	return fmt.Errorf("task %s not found in project tracks", task.ID)
}

func resolvePlanPath(projectPath, planPath string) string {
	// If planPath is a directory reference like ./tracks/foo/, append plan.md
	import_path := planPath
	if len(import_path) > 0 && import_path[len(import_path)-1] == '/' {
		import_path = import_path[:len(import_path)-1]
	}
	// If it doesn't end with .md, it's a directory - append plan.md
	if len(import_path) < 3 || import_path[len(import_path)-3:] != ".md" {
		import_path = import_path + "/plan.md"
	}
	// If relative, join with project path
	if len(import_path) > 0 && import_path[0] != '/' {
		import_path = projectPath + "/conductor/" + import_path
	}
	return import_path
}
