package dispatcher

import (
	"testing"
	"time"
)

func TestCandidateTypeConstants(t *testing.T) {
	if TypeTask != "task" {
		t.Errorf("TypeTask = %q, want %q", TypeTask, "task")
	}
	if TypeIssue != "issue" {
		t.Errorf("TypeIssue = %q, want %q", TypeIssue, "issue")
	}
}

func TestCandidateFields(t *testing.T) {
	now := time.Now()
	c := Candidate{
		ID:          "phase-1-1",
		Title:       "Implement user model",
		Description: "Create the user model with email and password fields",
		Type:        TypeTask,
		Priority:    1,
		CreatedAt:   now,
		ProjectID:   "proj-1",
		PlanPath:    "/path/to/plan.md",
	}

	if c.ID != "phase-1-1" {
		t.Errorf("ID = %q, want %q", c.ID, "phase-1-1")
	}
	if c.Title != "Implement user model" {
		t.Errorf("Title = %q, want %q", c.Title, "Implement user model")
	}
	if c.Type != TypeTask {
		t.Errorf("Type = %q, want %q", c.Type, TypeTask)
	}
	if c.Priority != 1 {
		t.Errorf("Priority = %d, want %d", c.Priority, 1)
	}
	if !c.CreatedAt.Equal(now) {
		t.Errorf("CreatedAt = %v, want %v", c.CreatedAt, now)
	}
}

func TestScoredCandidateFields(t *testing.T) {
	sc := ScoredCandidate{
		Candidate: Candidate{
			ID:    "task-1",
			Title: "Test task",
			Type:  TypeTask,
		},
		Score:     8.5,
		Rationale: "High priority frontend task with clear acceptance criteria",
		Rank:      1,
	}

	if sc.Score != 8.5 {
		t.Errorf("Score = %f, want %f", sc.Score, 8.5)
	}
	if sc.Rationale != "High priority frontend task with clear acceptance criteria" {
		t.Errorf("Rationale = %q, want %q", sc.Rationale, "High priority frontend task with clear acceptance criteria")
	}
	if sc.Rank != 1 {
		t.Errorf("Rank = %d, want %d", sc.Rank, 1)
	}
}

func TestCandidateAgeBoost(t *testing.T) {
	now := time.Now()
	oldCandidate := Candidate{
		ID:        "old-task",
		Title:     "Old task",
		CreatedAt: now.AddDate(0, 0, -3), // 3 days old
		Type:      TypeTask,
	}
	newCandidate := Candidate{
		ID:        "new-task",
		Title:     "New task",
		CreatedAt: now,
		Type:      TypeTask,
	}

	oldBoost := oldCandidate.AgeBoost()
	if oldBoost != 3 {
		t.Errorf("AgeBoost for 3-day-old task = %d, want %d", oldBoost, 3)
	}

	newBoost := newCandidate.AgeBoost()
	if newBoost != 0 {
		t.Errorf("AgeBoost for new task = %d, want %d", newBoost, 0)
	}

	// Test max boost (7+ days)
	veryOldCandidate := Candidate{
		ID:        "very-old-task",
		Title:     "Very old task",
		CreatedAt: now.AddDate(0, 0, -10),
		Type:      TypeTask,
	}
	veryOldBoost := veryOldCandidate.AgeBoost()
	if veryOldBoost != 3 {
		t.Errorf("AgeBoost for very old task = %d, want %d (max)", veryOldBoost, 3)
	}
}
