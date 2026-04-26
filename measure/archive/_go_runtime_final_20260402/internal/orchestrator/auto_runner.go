package orchestrator

import (
	"log"
	"sync"
	"time"

	"github.com/measure/fleet-commander/internal/models"
)

// IntervalFunc returns the current orchestrator interval in seconds.
// Called on each tick so interval changes take effect without restart.
type IntervalFunc func() int

// ProjectLister returns all registered projects.
type ProjectLister interface {
	GetAllProjects() []*models.Project
}

// AutoRunner periodically triggers orchestrator runs for all projects
// using a configurable interval that is re-read on each tick.
type AutoRunner struct {
	orch     *Orchestrator
	pm       ProjectLister
	interval IntervalFunc
	stopCh   chan struct{}
	mu       sync.Mutex
	running  bool
}

// NewAutoRunner creates an AutoRunner that uses intervalFn to get the
// current interval (in seconds) on each tick.
func NewAutoRunner(orch *Orchestrator, pm ProjectLister, intervalFn IntervalFunc) *AutoRunner {
	return &AutoRunner{
		orch:     orch,
		pm:       pm,
		interval: intervalFn,
		stopCh:   make(chan struct{}),
	}
}

// Start begins the auto-run loop. Non-blocking; runs in a goroutine.
func (ar *AutoRunner) Start() {
	ar.mu.Lock()
	if ar.running {
		ar.mu.Unlock()
		return
	}
	ar.running = true
	ar.stopCh = make(chan struct{})
	ar.mu.Unlock()

	go ar.loop()
}

// Stop halts the auto-run loop.
func (ar *AutoRunner) Stop() {
	ar.mu.Lock()
	defer ar.mu.Unlock()
	if !ar.running {
		return
	}
	ar.running = false
	close(ar.stopCh)
}

func (ar *AutoRunner) loop() {
	for {
		intervalSec := ar.interval()
		if intervalSec <= 0 {
			// Auto-run disabled; check again in 5s
			intervalSec = 5
		}

		select {
		case <-time.After(time.Duration(intervalSec) * time.Second):
			ar.runAll()
		case <-ar.stopCh:
			return
		}
	}
}

func (ar *AutoRunner) runAll() {
	projects := ar.pm.GetAllProjects()
	for _, p := range projects {
		go func(projectID string) {
			if err := ar.orch.Run(projectID); err != nil {
				// "no tasks available" is expected; only log unexpected errors
				if err.Error() != "no tasks available for project "+projectID &&
					err.Error() != "orchestrator already running for project "+projectID {
					log.Printf("AutoRunner: project %s: %v", projectID, err)
				}
			}
		}(p.ID)
	}
}
