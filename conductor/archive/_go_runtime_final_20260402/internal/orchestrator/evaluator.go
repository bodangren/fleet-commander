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

// IsTaskBlockedByDependencies checks if a task has any incomplete dependencies.
func IsTaskBlockedByDependencies(task *models.Task, allTasks map[string]*models.Task) bool {
	if len(task.Dependencies) == 0 {
		return false
	}
	for _, depID := range task.Dependencies {
		depTask, exists := allTasks[depID]
		if !exists || depTask.Status != models.StatusDone {
			return true
		}
	}
	return false
}

// ApplyDependencyBlocking sets task status to blocked if dependencies are incomplete.
// Returns true if any task was auto-blocked.
func ApplyDependencyBlocking(project *models.Project) bool {
	changed := false
	allTasks := collectAllTasks(project)

	for _, track := range project.Tracks {
		for _, phase := range track.Phases {
			for _, task := range phase.Tasks {
				if task.Status == models.StatusDone || task.Status == models.StatusActive {
					continue
				}
				if IsTaskBlockedByDependencies(task, allTasks) {
					if task.Status != models.StatusBlocked {
						task.Status = models.StatusBlocked
						changed = true
					}
				} else if task.Status == models.StatusBlocked {
					task.Status = models.StatusTodo
					changed = true
				}
			}
		}
	}
	return changed
}

// AutoUnblockDependents checks all tasks that depend on the completed task
// and unblocks them if all their dependencies are now satisfied.
func AutoUnblockDependents(project *models.Project, completedTaskID string) []string {
	unblocked := []string{}
	allTasks := collectAllTasks(project)

	for _, track := range project.Tracks {
		for _, phase := range track.Phases {
			for _, task := range phase.Tasks {
				if task.Status != models.StatusBlocked {
					continue
				}
				// Check if this task depends on the completed task
				dependsOnCompleted := false
				for _, depID := range task.Dependencies {
					if depID == completedTaskID {
						dependsOnCompleted = true
						break
					}
				}
				if !dependsOnCompleted {
					continue
				}
				// Check if all dependencies are now done
				if !IsTaskBlockedByDependencies(task, allTasks) {
					task.Status = models.StatusTodo
					unblocked = append(unblocked, task.ID)
				}
			}
		}
	}
	return unblocked
}

// collectAllTasks builds a map of all tasks by ID for quick lookup.
func collectAllTasks(project *models.Project) map[string]*models.Task {
	allTasks := make(map[string]*models.Task)
	for _, track := range project.Tracks {
		for _, phase := range track.Phases {
			for _, task := range phase.Tasks {
				allTasks[task.ID] = task
			}
		}
	}
	return allTasks
}

// GetBestTask returns the highest-scoring todo task across all active tracks
// in the project, or nil if none is available.
func GetBestTask(project *models.Project) *models.Task {
	// Apply dependency blocking before scoring
	ApplyDependencyBlocking(project)

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
