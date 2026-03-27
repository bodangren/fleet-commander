package orchestrator

import (
	"strings"

	"github.com/conductor/fleet-commander/internal/models"
)

// ScoreTask returns a priority score for a task.
// Blocked tasks score 0, high-priority tasks score 2, normal tasks score 1.
// Tasks that are not in "todo" status are ineligible (score -1).
func ScoreTask(task *models.Task) int {
	if task.Status != models.StatusTodo {
		return -1
	}
	if task.Status == models.StatusBlocked {
		return 0
	}
	// Check for priority:high tag in description or agentTag
	if strings.Contains(task.Description, "priority:high") || strings.Contains(task.AgentTag, "priority:high") {
		return 2
	}
	return 1
}

// GetBestTask returns the highest-scoring todo task across all active tracks
// in the project, or nil if none is available.
func GetBestTask(project *models.Project) *models.Task {
	var best *models.Task
	bestScore := -1

	for _, track := range project.Tracks {
		if track.Status == "done" {
			continue
		}
		for _, phase := range track.Phases {
			for _, task := range phase.Tasks {
				score := ScoreTask(task)
				if score > bestScore {
					bestScore = score
					best = task
				}
			}
		}
	}
	return best
}
