package sprintplanner

import (
	"sort"

	"github.com/conductor/fleet-commander/internal/models"
)

// SuggestedTask represents one task in a sprint suggestion.
type SuggestedTask struct {
	TaskID          string `json:"taskId"`
	Title           string `json:"title"`
	Rationale       string `json:"rationale"`
	EffortEstimate  int    `json:"effortEstimate"`
	DependencyGroup string `json:"dependencyGroup"`
}

// SprintSuggestion is the AI-generated sprint plan.
type SprintSuggestion struct {
	Goal        string          `json:"goal"`
	Duration    string          `json:"duration"`
	TotalEffort int             `json:"totalEffort"`
	Tasks       []SuggestedTask `json:"tasks"`
}

// GenerateFallbackSuggestion creates a priority-sorted sprint suggestion
// without using an LLM, based on task order and capacity.
func GenerateFallbackSuggestion(backlog []*models.Task, capacity int) *SprintSuggestion {
	if capacity <= 0 {
		capacity = 10
	}

	// Sort: active tasks first, then by phase order
	sorted := make([]*models.Task, len(backlog))
	copy(sorted, backlog)
	sort.SliceStable(sorted, func(i, j int) bool {
		if sorted[i].Status == models.StatusActive && sorted[j].Status != models.StatusActive {
			return true
		}
		return false
	})

	suggestion := &SprintSuggestion{
		Goal:     "Complete highest-priority backlog items",
		Duration: "2 weeks",
	}

	count := 0
	for _, task := range sorted {
		if count >= capacity {
			break
		}
		if task.Status == models.StatusDone {
			continue
		}

		effort := estimateEffort(task)
		suggestion.Tasks = append(suggestion.Tasks, SuggestedTask{
			TaskID:          task.ID,
			Title:           task.Description,
			Rationale:       generateRationale(task),
			EffortEstimate:  effort,
			DependencyGroup: task.Phase,
		})
		suggestion.TotalEffort += effort
		count++
	}

	return suggestion
}

func estimateEffort(task *models.Task) int {
	descLen := len(task.Description)
	switch {
	case descLen < 30:
		return 1
	case descLen < 60:
		return 2
	case descLen < 100:
		return 3
	case descLen < 150:
		return 5
	default:
		return 8
	}
}

func generateRationale(task *models.Task) string {
	if task.Status == models.StatusActive {
		return "Currently in progress — include to continue work"
	}
	if task.Status == models.StatusBlocked {
		return "Blocked — resolve blockers to unblock downstream tasks"
	}
	if task.Phase != "" {
		return "Part of " + task.Phase + " — maintains phase coherence"
	}
	return "Pending backlog item — included by priority order"
}
