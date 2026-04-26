package sprintplanner

import (
	"fmt"
	"strings"

	"github.com/measure/fleet-commander/internal/models"
)

// BuildPlanningPrompt constructs a prompt for the LLM to suggest a sprint composition.
func BuildPlanningPrompt(backlog []*models.Task, velocity float64, capacity int) string {
	var sb strings.Builder

	sb.WriteString("You are a sprint planning assistant. Analyze the following backlog and suggest a sprint.\n\n")
	sb.WriteString("## Backlog\n\n")

	for i, task := range backlog {
		sb.WriteString(fmt.Sprintf("%d. [%s] %s", i+1, task.Status, task.Description))
		if task.AgentTag != "" {
			sb.WriteString(fmt.Sprintf(" @%s", task.AgentTag))
		}
		if task.Phase != "" {
			sb.WriteString(fmt.Sprintf(" (Phase: %s)", task.Phase))
		}
		sb.WriteString("\n")
	}

	sb.WriteString(fmt.Sprintf("\n## Team Metrics\n- Historical velocity: %.1f tasks/sprint\n- Team capacity: %d tasks/week\n", velocity, capacity))

	sb.WriteString(`
## Instructions
Return a JSON object with this structure:
{
  "goal": "Sprint goal description",
  "duration": "2 weeks",
  "totalEffort": 13,
  "tasks": [
    {
      "taskId": "task-id",
      "title": "Task description",
      "rationale": "Why this task should be in this sprint",
      "effortEstimate": 3,
      "dependencyGroup": "group-name"
    }
  ]
}

Group related tasks together. Prioritize critical-path tasks. Include effort estimates (1-13 scale).
`)

	return sb.String()
}
