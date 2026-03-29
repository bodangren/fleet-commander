package orchestrator

import (
	"testing"

	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/registry"
)

type mockExecutor struct {
	called   bool
	taskID   string
	taskDesc string
	agentTag string
	err      error
}

func (m *mockExecutor) ExecuteTask(_, taskID, taskDesc, _, _, agentTag string) error {
	m.called = true
	m.taskID = taskID
	m.taskDesc = taskDesc
	m.agentTag = agentTag
	return m.err
}

func TestRunDelegatesToExecutor(t *testing.T) {
	pm := registry.NewProjectManager()
	project := &models.Project{
		ID:   "test-project",
		Name: "test",
		Path: "/tmp/test-project",
		Tracks: []*models.Track{
			{
				Status: "active",
				Phases: []*models.Phase{
					{
						Name: "Phase 1",
						Tasks: []*models.Task{
							{ID: "t1", Description: "Build feature", Status: models.StatusTodo, AgentTag: "senior-frontend"},
						},
					},
				},
			},
		},
	}
	pm.UpdateProject(project)

	mock := &mockExecutor{}
	orch := New(pm, WithExecutor(mock))

	err := orch.Run("test-project")
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	if !mock.called {
		t.Fatal("Expected executor to be called")
	}
	if mock.taskID != "t1" {
		t.Errorf("Expected taskID 't1', got %q", mock.taskID)
	}
	if mock.taskDesc != "Build feature" {
		t.Errorf("Expected taskDesc 'Build feature', got %q", mock.taskDesc)
	}
	if mock.agentTag != "senior-frontend" {
		t.Errorf("Expected agentTag 'senior-frontend', got %q", mock.agentTag)
	}

	updated, _ := pm.GetProject("test-project")
	task := updated.Tracks[0].Phases[0].Tasks[0]
	if task.Status != models.StatusDone {
		t.Errorf("Expected task status 'done', got %q", task.Status)
	}
}

func TestRunWithoutExecutor(t *testing.T) {
	pm := registry.NewProjectManager()
	project := &models.Project{
		ID:   "test-project",
		Name: "test",
		Path: "/tmp/test-project",
		Tracks: []*models.Track{
			{
				Status: "active",
				Phases: []*models.Phase{
					{
						Tasks: []*models.Task{
							{ID: "t1", Description: "Do thing", Status: models.StatusTodo},
						},
					},
				},
			},
		},
	}
	pm.UpdateProject(project)

	orch := New(pm)

	err := orch.Run("test-project")
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	updated, _ := pm.GetProject("test-project")
	task := updated.Tracks[0].Phases[0].Tasks[0]
	if task.Status != models.StatusDone {
		t.Errorf("Expected task status 'done' even without executor, got %q", task.Status)
	}
}
