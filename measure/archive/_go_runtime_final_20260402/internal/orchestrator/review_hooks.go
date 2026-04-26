package orchestrator

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/measure/fleet-commander/internal/issues"
	"github.com/measure/fleet-commander/internal/logs"
	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/review"
)

// handleReviewResults processes review pipeline output after task completion.
// If any check fails, it creates a blocker issue and marks the task as blocked.
func (o *Orchestrator) handleReviewResults(projectID string, task *models.Task, results []review.CheckResult) {
	// Log review results
	o.writeLog(logs.TypeCompletion, projectID, ReviewLogData{
		TaskID:     task.ID,
		Status:     "reviewed",
		Results:    results,
		ReviewedAt: time.Now(),
	})

	// Check for failures
	var failedChecks []string
	for _, r := range results {
		if r.Status == review.StatusFailed || r.Status == review.StatusTimeout {
			failedChecks = append(failedChecks, fmt.Sprintf("%s: %s", r.Category, r.Status))
		}
	}

	if len(failedChecks) == 0 {
		log.Printf("Review passed for task %s in project %s", task.ID, projectID)
		o.broadcastStatus(projectID, task.ID, "review_passed", map[string]any{
			"checks": len(results),
		})
		return
	}

	// Review failed — create blocker issue
	log.Printf("Review failed for task %s: %v", task.ID, failedChecks)
	o.createReviewBlockerIssue(projectID, task, results)

	// Mark task as blocked
	task.Status = models.StatusBlocked
	o.broadcastStatus(projectID, task.ID, "review_failed", map[string]any{
		"failed": failedChecks,
	})
}

// createReviewBlockerIssue creates a blocker issue when review checks fail.
func (o *Orchestrator) createReviewBlockerIssue(projectID string, task *models.Task, results []review.CheckResult) {
	if o.issueStore == nil {
		log.Printf("No issue store configured; skipping review blocker for task %s", task.ID)
		return
	}

	var failedDetails string
	for _, r := range results {
		if r.Status == review.StatusFailed || r.Status == review.StatusTimeout {
			failedDetails += fmt.Sprintf("\n### %s (%s)\n", r.Category, r.Status)
			for _, err := range r.Errors {
				failedDetails += fmt.Sprintf("- %s\n", err)
			}
		}
	}

	title := fmt.Sprintf("Review failed for task %s", task.ID)
	description := fmt.Sprintf(
		"Automated code review detected issues after task completion.\n\n%s",
		failedDetails,
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
		log.Printf("Warning: failed to save review blocker issue for task %s: %v", task.ID, err)
		return
	}

	log.Printf("Created review blocker issue %s for task %s", issue.ID, task.ID)
}

// ReviewRunnerImpl implements ReviewRunner using the review package.
type ReviewRunnerImpl struct{}

// Run executes the review pipeline for a project root.
func (r *ReviewRunnerImpl) Run(ctx context.Context, projectRoot string) ([]review.CheckResult, error) {
	runner := review.NewRunner()
	return runner.Run(ctx, projectRoot)
}

// ReviewLogData holds review results for logging.
type ReviewLogData struct {
	TaskID     string               `json:"taskId"`
	Status     string               `json:"status"`
	Results    []review.CheckResult `json:"results"`
	ReviewedAt time.Time            `json:"reviewedAt"`
}
