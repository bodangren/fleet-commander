package orchestrator

import (
	"github.com/conductor/fleet-commander/internal/issues"
)

// broadcastStatus sends an execution_status event via WebSocket if a broadcaster is configured.
func (o *Orchestrator) broadcastStatus(projectID, taskID, status string, details map[string]any) {
	if o.broadcaster == nil {
		return
	}
	msg := map[string]any{
		"type":      "execution_status",
		"projectId": projectID,
		"taskId":    taskID,
		"status":    status,
	}
	for k, v := range details {
		msg[k] = v
	}
	o.broadcaster.Broadcast(projectID, msg)
}

// broadcastIssueCreated sends an issue_created event via WebSocket if a broadcaster is configured.
func (o *Orchestrator) broadcastIssueCreated(projectID string, issue *issues.Issue) {
	if o.broadcaster == nil {
		return
	}
	o.broadcaster.Broadcast(projectID, map[string]any{
		"type":   "issue_created",
		"issue":  issue,
		"taskId": issue.RelatedTask,
	})
}
