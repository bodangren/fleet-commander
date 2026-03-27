package orchestrator

import (
	"testing"

	"github.com/conductor/fleet-commander/internal/models"
)

func TestScoreTask(t *testing.T) {
	tests := []struct {
		name  string
		task  *models.Task
		score int
	}{
		{
			name:  "todo task scores 1",
			task:  &models.Task{ID: "t1", Status: models.StatusTodo},
			score: 1,
		},
		{
			name:  "done task is ineligible",
			task:  &models.Task{ID: "t2", Status: models.StatusDone},
			score: -1,
		},
		{
			name:  "active task is ineligible",
			task:  &models.Task{ID: "t3", Status: models.StatusActive},
			score: -1,
		},
		{
			name:  "priority:high task scores 2",
			task:  &models.Task{ID: "t4", Status: models.StatusTodo, Description: "Do thing priority:high"},
			score: 2,
		},
		{
			name:  "blocked task is ineligible (not todo)",
			task:  &models.Task{ID: "t5", Status: models.StatusBlocked},
			score: -1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ScoreTask(tt.task)
			if got != tt.score {
				t.Errorf("ScoreTask() = %d, want %d", got, tt.score)
			}
		})
	}
}

func TestGetBestTask(t *testing.T) {
	t.Run("returns highest scoring task", func(t *testing.T) {
		project := &models.Project{
			Tracks: []*models.Track{
				{
					Status: "active",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Status: models.StatusTodo, Description: "Normal task"},
								{ID: "t2", Status: models.StatusTodo, Description: "High priority:high task"},
							},
						},
					},
				},
			},
		}

		task := GetBestTask(project)
		if task == nil {
			t.Fatal("Expected a task, got nil")
		}
		if task.ID != "t2" {
			t.Errorf("Expected task t2 (high priority), got %s", task.ID)
		}
	})

	t.Run("returns nil when no todo tasks", func(t *testing.T) {
		project := &models.Project{
			Tracks: []*models.Track{
				{
					Status: "active",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Status: models.StatusDone},
							},
						},
					},
				},
			},
		}

		task := GetBestTask(project)
		if task != nil {
			t.Errorf("Expected nil, got %v", task)
		}
	})

	t.Run("skips done tracks", func(t *testing.T) {
		project := &models.Project{
			Tracks: []*models.Track{
				{
					Status: "done",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Status: models.StatusTodo},
							},
						},
					},
				},
			},
		}

		task := GetBestTask(project)
		if task != nil {
			t.Errorf("Expected nil (done track skipped), got %v", task)
		}
	})
}
