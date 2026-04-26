package orchestrator

import (
	"fmt"
	"log"
	"time"

	"github.com/measure/fleet-commander/internal/issues"
	"github.com/measure/fleet-commander/internal/models"
)

// createBlockerIssue creates a blocker issue when a task permanently fails.
func (o *Orchestrator) createBlockerIssue(projectID string, task *models.Task, result *models.ExecutionResult, attempts int) {
	if o.issueStore == nil {
		log.Printf("No issue store configured; skipping blocker issue creation for task %s", task.ID)
		return
	}

	title := fmt.Sprintf("Task %s blocked: %s", task.ID, task.Description)
	description := fmt.Sprintf(
		"Task failed after %d attempt(s).\n\n"+
			"**Error:** %s\n\n"+
			"**Failure Type:** %s\n\n"+
			"**Exit Code:** %d\n\n"+
			"**Duration:** %dms",
		attempts,
		result.Error,
		string(result.FailureType),
		result.ExitCode,
		result.Duration,
	)

	issue := &issues.Issue{
		ID:          issues.GenerateIssueID(issues.TypeBlocker),
		Title:       title,
		Description: description,
		Type:        issues.TypeBlocker,
		Status:      issues.StatusOpen,
		CreatedAt:   time.Now(),
		RelatedTask: task.ID,
		ProjectID:   projectID,
	}

	if err := o.issueStore.Save(issue); err != nil {
		log.Printf("Warning: failed to save blocker issue for task %s: %v", task.ID, err)
		return
	}

	log.Printf("Created blocker issue %s for task %s", issue.ID, task.ID)
	task.Status = models.StatusBlocked
}

// createDelegationIssues creates delegation issues from parsed agent output.
func (o *Orchestrator) createDelegationIssues(projectID string, task *models.Task, output string) {
	if output == "" || o.issueStore == nil {
		return
	}

	parsedIssues := ParseIssues(output)
	for _, pi := range parsedIssues {
		issue := &issues.Issue{
			ID:          issues.GenerateIssueID(issues.TypeDelegation),
			Title:       pi.Title,
			Description: pi.Description,
			Type:        issues.TypeDelegation,
			Status:      issues.StatusOpen,
			CreatedAt:   time.Now(),
			RelatedTask: task.ID,
			ProjectID:   projectID,
		}

		if err := o.issueStore.Save(issue); err != nil {
			log.Printf("Warning: failed to save auto-created issue %q: %v", pi.Title, err)
		} else {
			log.Printf("Auto-created issue %s from agent output: %s", issue.ID, pi.Title)
			o.broadcastIssueCreated(projectID, issue)
		}
	}
	if len(parsedIssues) > 0 {
		log.Printf("Parsed %d issue(s) from agent output for task %s", len(parsedIssues), task.ID)
	}
}
