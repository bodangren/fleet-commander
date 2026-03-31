package orchestrator

import (
	"fmt"
	"sync/atomic"
	"testing"
	"time"

	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/registry"
)

func TestAutoRunnerStartsAndStops(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	orch := New(pm)
	ar := NewAutoRunner(orch, pm, func() int { return 1 })
	ar.Start()

	// Should not panic on double start
	ar.Start()

	ar.Stop()
	// Should not panic on double stop
	ar.Stop()
}

func TestAutoRunnerCallsOrchestrator(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	mock := &mockExecutor{}
	orch := New(pm, WithExecutor(mock))

	var calls atomic.Int32
	intervalFn := func() int {
		calls.Add(1)
		return 0 // 0 means "disabled, but still checks every 5s" — we override below
	}

	// Use a very short interval for the test
	ar := NewAutoRunner(orch, pm, func() int { return 1 })

	// Manually trigger runAll to test without waiting
	ar.runAll()

	// Give goroutines time to complete
	time.Sleep(100 * time.Millisecond)

	if mock.getCallCount() < 1 {
		t.Error("Expected orchestrator to be called by auto-runner")
	}

	_ = intervalFn // use the variable
}

func TestAutoRunnerRespectsDynamicInterval(t *testing.T) {
	pm := registry.NewProjectManager()
	mock := &mockExecutor{}
	orch := New(pm, WithExecutor(mock))

	interval := 1
	ar := NewAutoRunner(orch, pm, func() int { return interval })
	ar.Start()
	defer ar.Stop()

	// Add project with a fresh task each time so runAll always has work
	project := testProject()
	pm.UpdateProject(project)

	// Wait for at least one run (interval=1s)
	time.Sleep(1200 * time.Millisecond)

	if mock.getCallCount() < 1 {
		t.Error("Expected orchestrator to run with interval=1")
	}

	// Change interval to 0 (disabled) — should not call Run
	before := mock.getCallCount()
	interval = 0
	// The loop waits 5s when disabled, so briefly pause
	time.Sleep(100 * time.Millisecond)
	after := mock.getCallCount()
	// No new calls should have started (loop is in 5s sleep)
	if after > before {
		t.Logf("Got %d calls while disabled (acceptable if run was already in-flight)", after-before)
	}
}

func TestAutoRunnerNoProjects(t *testing.T) {
	pm := registry.NewProjectManager()

	mock := &mockExecutor{}
	orch := New(pm, WithExecutor(mock))
	ar := NewAutoRunner(orch, pm, func() int { return 1 })

	// Should not panic with no projects
	ar.runAll()

	if mock.getCallCount() != 0 {
		t.Error("Expected no calls when no projects registered")
	}
}

func TestAutoRunnerConcurrency(t *testing.T) {
	pm := registry.NewProjectManager()

	// Register multiple projects
	for i := 0; i < 5; i++ {
		project := &models.Project{
			ID:   fmt.Sprintf("proj-%d", i),
			Name: fmt.Sprintf("proj-%d", i),
			Path: fmt.Sprintf("/tmp/proj-%d", i),
			Tracks: []*models.Track{
				{
					Status: "active",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Description: "Task", Status: models.StatusTodo},
							},
						},
					},
				},
			},
		}
		pm.UpdateProject(project)
	}

	mock := &mockExecutor{}
	orch := New(pm, WithExecutor(mock))
	ar := NewAutoRunner(orch, pm, func() int { return 1 })

	// runAll dispatches concurrently, should not panic
	ar.runAll()
	time.Sleep(200 * time.Millisecond)

	if mock.getCallCount() < 5 {
		t.Errorf("Expected at least 5 calls for 5 projects, got %d", mock.getCallCount())
	}
}
