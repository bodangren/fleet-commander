package dispatcher

import (
	"time"
)

const (
	TypeTask  = "task"
	TypeIssue = "issue"
)

type Candidate struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	Type        string    `json:"type"` // "task" or "issue"
	Priority    int       `json:"priority,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	ProjectID   string    `json:"projectId,omitempty"`
	PlanPath    string    `json:"planPath,omitempty"`
	AgentTag    string    `json:"agentTag,omitempty"`
}

func (c Candidate) AgeBoost() int {
	daysOld := int(time.Since(c.CreatedAt).Hours() / 24)
	if daysOld < 0 {
		return 0
	}
	if daysOld > 3 {
		return 3
	}
	return daysOld
}

type ScoredCandidate struct {
	Candidate
	Score     float64 `json:"score"`
	Rationale string  `json:"rationale,omitempty"`
	Rank      int     `json:"rank,omitempty"`
}
