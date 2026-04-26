package estimation

import (
	"testing"

	"github.com/measure/fleet-commander/internal/models"
)

func TestSuggestEstimate(t *testing.T) {
	tests := []struct {
		desc     string
		expected int
	}{
		{"Fix bug", 1},
		{"Add validation to input form", 2},
		{"Implement the user authentication flow with password reset and email verification", 5},
		{"Build a comprehensive dashboard with real-time metrics, charts, historical trends analysis, agent utilization tracking, and export capabilities for all project data across multiple views and time ranges", 13},
	}

	for _, tt := range tests {
		task := &models.Task{ID: "t1", Description: tt.desc}
		result := SuggestEstimate(task)

		if result.Estimate.Value != tt.expected {
			t.Errorf("desc=%q: expected %d points, got %d", tt.desc, tt.expected, result.Estimate.Value)
		}
		if result.Estimate.Scale != "points" {
			t.Errorf("expected scale 'points', got %q", result.Estimate.Scale)
		}
		if !result.Estimate.Suggested {
			t.Error("expected Suggested=true")
		}
		if result.Reasoning == "" {
			t.Error("expected non-empty reasoning")
		}
	}
}

func TestComputeAccuracy(t *testing.T) {
	tasks := []*models.Task{
		{ID: "t1", Status: models.StatusDone, Estimate: &models.Estimate{Value: 3}, CompletedAt: 1000},
		{ID: "t2", Status: models.StatusDone, Estimate: &models.Estimate{Value: 5}, CompletedAt: 2000},
		{ID: "t3", Status: models.StatusTodo, Estimate: &models.Estimate{Value: 2}},
		{ID: "t4", Status: models.StatusTodo}, // no estimate
	}

	stats := ComputeAccuracy(tasks)
	if stats.TotalEstimated != 3 {
		t.Errorf("expected 3 estimated, got %d", stats.TotalEstimated)
	}
	if stats.TotalCompleted != 2 {
		t.Errorf("expected 2 completed with estimates, got %d", stats.TotalCompleted)
	}
}
