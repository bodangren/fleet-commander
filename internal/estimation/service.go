package estimation

import (
	"github.com/conductor/fleet-commander/internal/models"
)

// EstimationResult holds an AI-suggested estimate with reasoning.
type EstimationResult struct {
	Estimate  models.Estimate `json:"estimate"`
	Reasoning string          `json:"reasoning"`
}

// SuggestEstimate generates an estimate for a task based on heuristics.
// When an LLM client is available, this can be enhanced to use AI.
func SuggestEstimate(task *models.Task) *EstimationResult {
	points := heuristicEstimate(task)

	return &EstimationResult{
		Estimate: models.Estimate{
			Value:     points,
			Scale:     "points",
			Suggested: true,
		},
		Reasoning: heuristicReasoning(task, points),
	}
}

func heuristicEstimate(task *models.Task) int {
	descLen := len(task.Description)

	// Base estimate from description complexity
	var points int
	switch {
	case descLen < 20:
		points = 1
	case descLen < 40:
		points = 2
	case descLen < 80:
		points = 3
	case descLen < 120:
		points = 5
	case descLen < 200:
		points = 8
	default:
		points = 13
	}

	return points
}

func heuristicReasoning(task *models.Task, points int) string {
	switch {
	case points <= 2:
		return "Short description suggests a simple, well-defined task"
	case points <= 5:
		return "Moderate description length indicates medium complexity"
	case points <= 8:
		return "Detailed description suggests significant implementation work"
	default:
		return "Very detailed description indicates a complex task that may benefit from decomposition"
	}
}

// AccuracyStats holds estimation accuracy metrics.
type AccuracyStats struct {
	TotalEstimated   int     `json:"totalEstimated"`
	TotalCompleted   int     `json:"totalCompleted"`
	AvgAccuracyRatio float64 `json:"avgAccuracyRatio"`
}

// ComputeAccuracy computes estimation accuracy across completed tasks.
func ComputeAccuracy(tasks []*models.Task) *AccuracyStats {
	stats := &AccuracyStats{}

	for _, task := range tasks {
		if task.Estimate != nil {
			stats.TotalEstimated++
		}
		if task.Status == models.StatusDone && task.Estimate != nil && task.CompletedAt > 0 {
			stats.TotalCompleted++
		}
	}

	if stats.TotalCompleted > 0 {
		stats.AvgAccuracyRatio = float64(stats.TotalCompleted) / float64(stats.TotalEstimated)
	}

	return stats
}
