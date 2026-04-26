package sprintplanner

import (
	"strings"
	"testing"

	"github.com/measure/fleet-commander/internal/models"
)

func TestBuildPlanningPrompt(t *testing.T) {
	backlog := []*models.Task{
		{ID: "t1", Description: "Write tests", Status: models.StatusTodo, Phase: "Phase 1"},
		{ID: "t2", Description: "Implement feature", Status: models.StatusActive, AgentTag: "coder"},
	}

	prompt := BuildPlanningPrompt(backlog, 8.5, 5)

	if !strings.Contains(prompt, "Write tests") {
		t.Error("prompt should contain task descriptions")
	}
	if !strings.Contains(prompt, "@coder") {
		t.Error("prompt should contain agent tags")
	}
	if !strings.Contains(prompt, "8.5") {
		t.Error("prompt should contain velocity")
	}
	if !strings.Contains(prompt, "JSON") {
		t.Error("prompt should request JSON output")
	}
}

func TestGenerateFallbackSuggestion(t *testing.T) {
	backlog := []*models.Task{
		{ID: "t1", Description: "Short task", Status: models.StatusTodo},
		{ID: "t2", Description: "Currently active task being worked on", Status: models.StatusActive},
		{ID: "t3", Description: "Already done", Status: models.StatusDone},
		{ID: "t4", Description: "Another pending task with a longer description that needs more effort", Status: models.StatusTodo},
	}

	suggestion := GenerateFallbackSuggestion(backlog, 3)

	if len(suggestion.Tasks) != 3 {
		t.Errorf("expected 3 tasks (capacity), got %d", len(suggestion.Tasks))
	}

	// Active task should be first
	if suggestion.Tasks[0].TaskID != "t2" {
		t.Errorf("expected active task first, got %s", suggestion.Tasks[0].TaskID)
	}

	// Done task should be excluded
	for _, task := range suggestion.Tasks {
		if task.TaskID == "t3" {
			t.Error("done tasks should not be included")
		}
	}

	if suggestion.TotalEffort <= 0 {
		t.Error("total effort should be positive")
	}

	if suggestion.Goal == "" {
		t.Error("suggestion should have a goal")
	}
}

func TestGenerateFallbackSuggestionEmpty(t *testing.T) {
	suggestion := GenerateFallbackSuggestion([]*models.Task{}, 10)
	if len(suggestion.Tasks) != 0 {
		t.Errorf("expected 0 tasks for empty backlog, got %d", len(suggestion.Tasks))
	}
}
