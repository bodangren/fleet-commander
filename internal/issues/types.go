package issues

import (
	"fmt"
	"time"
)

type IssueType string

const (
	TypeBlocker        IssueType = "blocker"
	TypeDelegation     IssueType = "delegation"
	TypeClarification  IssueType = "clarification"
	TypeFeatureRequest IssueType = "feature-request"
)

type IssueStatus string

const (
	StatusOpen      IssueStatus = "open"
	StatusResolved  IssueStatus = "resolved"
	StatusDuplicate IssueStatus = "duplicate"
)

type Issue struct {
	ID          string      `json:"id"`
	Title       string      `json:"title"`
	Description string      `json:"description,omitempty"`
	Type        IssueType   `json:"type"`
	Status      IssueStatus `json:"status"`
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt,omitempty"`
	RelatedTask string      `json:"relatedTask,omitempty"`
	ProjectID   string      `json:"projectId,omitempty"`
}

func GenerateIssueID(issueType IssueType) string {
	ts := time.Now().Unix()
	return fmt.Sprintf("issue-%d-%s", ts, issueType)
}

func (i *Issue) SetStatus(newStatus IssueStatus) {
	i.Status = newStatus
	i.UpdatedAt = time.Now()
}
