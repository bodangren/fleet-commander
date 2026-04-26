package orchestrator

import (
	"testing"

	"github.com/measure/fleet-commander/internal/models"
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

func TestIsTaskBlockedByDependencies(t *testing.T) {
	t.Run("no dependencies returns false", func(t *testing.T) {
		task := &models.Task{ID: "t1", Status: models.StatusTodo}
		allTasks := map[string]*models.Task{"t1": task}
		if IsTaskBlockedByDependencies(task, allTasks) {
			t.Error("Expected no blocking without dependencies")
		}
	})

	t.Run("dependency done returns false", func(t *testing.T) {
		task := &models.Task{ID: "t2", Status: models.StatusTodo, Dependencies: []string{"t1"}}
		allTasks := map[string]*models.Task{
			"t1": {ID: "t1", Status: models.StatusDone},
			"t2": task,
		}
		if IsTaskBlockedByDependencies(task, allTasks) {
			t.Error("Expected no blocking when dependency is done")
		}
	})

	t.Run("dependency todo returns true", func(t *testing.T) {
		task := &models.Task{ID: "t2", Status: models.StatusTodo, Dependencies: []string{"t1"}}
		allTasks := map[string]*models.Task{
			"t1": {ID: "t1", Status: models.StatusTodo},
			"t2": task,
		}
		if !IsTaskBlockedByDependencies(task, allTasks) {
			t.Error("Expected blocking when dependency is not done")
		}
	})

	t.Run("missing dependency returns true", func(t *testing.T) {
		task := &models.Task{ID: "t2", Status: models.StatusTodo, Dependencies: []string{"missing"}}
		allTasks := map[string]*models.Task{"t2": task}
		if !IsTaskBlockedByDependencies(task, allTasks) {
			t.Error("Expected blocking when dependency is missing")
		}
	})

	t.Run("one of multiple dependencies not done returns true", func(t *testing.T) {
		task := &models.Task{ID: "t3", Status: models.StatusTodo, Dependencies: []string{"t1", "t2"}}
		allTasks := map[string]*models.Task{
			"t1": {ID: "t1", Status: models.StatusDone},
			"t2": {ID: "t2", Status: models.StatusTodo},
			"t3": task,
		}
		if !IsTaskBlockedByDependencies(task, allTasks) {
			t.Error("Expected blocking when one dependency is not done")
		}
	})
}

func TestApplyDependencyBlocking(t *testing.T) {
	t.Run("blocks tasks with incomplete dependencies", func(t *testing.T) {
		project := &models.Project{
			Tracks: []*models.Track{
				{
					Status: "active",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Status: models.StatusTodo},
								{ID: "t2", Status: models.StatusTodo, Dependencies: []string{"t1"}},
							},
						},
					},
				},
			},
		}

		changed := ApplyDependencyBlocking(project)
		if !changed {
			t.Error("Expected changes to be made")
		}

		// t2 should be blocked
		if project.Tracks[0].Phases[0].Tasks[1].Status != models.StatusBlocked {
			t.Error("Expected t2 to be blocked")
		}
	})

	t.Run("unblocks tasks when dependencies are done", func(t *testing.T) {
		project := &models.Project{
			Tracks: []*models.Track{
				{
					Status: "active",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Status: models.StatusDone},
								{ID: "t2", Status: models.StatusBlocked, Dependencies: []string{"t1"}},
							},
						},
					},
				},
			},
		}

		changed := ApplyDependencyBlocking(project)
		if !changed {
			t.Error("Expected changes to be made")
		}

		// t2 should be unblocked back to todo
		if project.Tracks[0].Phases[0].Tasks[1].Status != models.StatusTodo {
			t.Errorf("Expected t2 to be todo, got %s", project.Tracks[0].Phases[0].Tasks[1].Status)
		}
	})

	t.Run("does not block tasks with all dependencies done", func(t *testing.T) {
		project := &models.Project{
			Tracks: []*models.Track{
				{
					Status: "active",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Status: models.StatusDone},
								{ID: "t2", Status: models.StatusTodo, Dependencies: []string{"t1"}},
							},
						},
					},
				},
			},
		}

		ApplyDependencyBlocking(project)

		// t2 should remain todo since its dependency is done
		if project.Tracks[0].Phases[0].Tasks[1].Status != models.StatusTodo {
			t.Errorf("Expected t2 to stay todo, got %s", project.Tracks[0].Phases[0].Tasks[1].Status)
		}
	})
}

func TestAutoUnblockDependents(t *testing.T) {
	t.Run("unblocks tasks when their last dependency completes", func(t *testing.T) {
		project := &models.Project{
			Tracks: []*models.Track{
				{
					Status: "active",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Status: models.StatusDone},
								{ID: "t2", Status: models.StatusBlocked, Dependencies: []string{"t1"}},
								{ID: "t3", Status: models.StatusBlocked, Dependencies: []string{"t2"}},
							},
						},
					},
				},
			},
		}

		unblocked := AutoUnblockDependents(project, "t1")
		if len(unblocked) != 1 {
			t.Fatalf("Expected 1 unblocked task, got %d", len(unblocked))
		}
		if unblocked[0] != "t2" {
			t.Errorf("Expected t2 to be unblocked, got %s", unblocked[0])
		}
		// t3 should remain blocked since t2 is not done
		if project.Tracks[0].Phases[0].Tasks[2].Status != models.StatusBlocked {
			t.Error("Expected t3 to remain blocked")
		}
	})

	t.Run("returns empty when no dependents", func(t *testing.T) {
		project := &models.Project{
			Tracks: []*models.Track{
				{
					Status: "active",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Status: models.StatusDone},
								{ID: "t2", Status: models.StatusTodo},
							},
						},
					},
				},
			},
		}

		unblocked := AutoUnblockDependents(project, "t1")
		if len(unblocked) != 0 {
			t.Errorf("Expected 0 unblocked tasks, got %d", len(unblocked))
		}
	})

	t.Run("does not unblock when other dependencies remain", func(t *testing.T) {
		project := &models.Project{
			Tracks: []*models.Track{
				{
					Status: "active",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Status: models.StatusDone},
								{ID: "t2", Status: models.StatusTodo},
								{ID: "t3", Status: models.StatusBlocked, Dependencies: []string{"t1", "t2"}},
							},
						},
					},
				},
			},
		}

		unblocked := AutoUnblockDependents(project, "t1")
		if len(unblocked) != 0 {
			t.Errorf("Expected 0 unblocked tasks (t2 still todo), got %d", len(unblocked))
		}
	})
}

func TestGetBestTaskWithDependencies(t *testing.T) {
	t.Run("skips blocked tasks", func(t *testing.T) {
		project := &models.Project{
			Tracks: []*models.Track{
				{
					Status: "active",
					Phases: []*models.Phase{
						{
							Tasks: []*models.Task{
								{ID: "t1", Status: models.StatusTodo},
								{ID: "t2", Status: models.StatusTodo, Dependencies: []string{"t1"}},
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
		// t2 should be blocked by t1, so t1 should be returned
		if task.ID != "t1" {
			t.Errorf("Expected t1 (unblocked), got %s", task.ID)
		}
	})
}
