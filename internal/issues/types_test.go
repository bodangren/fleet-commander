package issues

import (
	"testing"
	"time"
)

func TestIssueTypes(t *testing.T) {
	if TypeBlocker != "blocker" {
		t.Errorf("TypeBlocker = %q, want %q", TypeBlocker, "blocker")
	}
	if TypeDelegation != "delegation" {
		t.Errorf("TypeDelegation = %q, want %q", TypeDelegation, "delegation")
	}
	if TypeClarification != "clarification" {
		t.Errorf("TypeClarification = %q, want %q", TypeClarification, "clarification")
	}
	if TypeFeatureRequest != "feature-request" {
		t.Errorf("TypeFeatureRequest = %q, want %q", TypeFeatureRequest, "feature-request")
	}
}

func TestIssueStatus(t *testing.T) {
	if StatusOpen != "open" {
		t.Errorf("StatusOpen = %q, want %q", StatusOpen, "open")
	}
	if StatusResolved != "resolved" {
		t.Errorf("StatusResolved = %q, want %q", StatusResolved, "resolved")
	}
	if StatusDuplicate != "duplicate" {
		t.Errorf("StatusDuplicate = %q, want %q", StatusDuplicate, "duplicate")
	}
}

func TestIssueFields(t *testing.T) {
	now := time.Now()
	issue := Issue{
		ID:          "issue-123",
		Title:       "Fix authentication bug",
		Description: "Users cannot login with OAuth",
		Type:        TypeBlocker,
		Status:      StatusOpen,
		CreatedAt:   now,
		ProjectID:   "proj-1",
		RelatedTask: "phase-1-1",
	}

	if issue.ID != "issue-123" {
		t.Errorf("ID = %q, want %q", issue.ID, "issue-123")
	}
	if issue.Title != "Fix authentication bug" {
		t.Errorf("Title = %q, want %q", issue.Title, "Fix authentication bug")
	}
	if issue.Type != TypeBlocker {
		t.Errorf("Type = %q, want %q", issue.Type, TypeBlocker)
	}
	if issue.Status != StatusOpen {
		t.Errorf("Status = %q, want %q", issue.Status, StatusOpen)
	}
}

func TestGenerateIssueID(t *testing.T) {
	id := GenerateIssueID(TypeBlocker)
	if len(id) < 10 {
		t.Errorf("Generated ID too short: %q", id)
	}
	if id[:6] != "issue-" {
		t.Errorf("ID should start with 'issue-': %q", id)
	}
}

func TestIssueSetStatus(t *testing.T) {
	issue := Issue{
		ID:        "issue-1",
		Status:    StatusOpen,
		CreatedAt: time.Now(),
	}

	issue.SetStatus(StatusResolved)

	if issue.Status != StatusResolved {
		t.Errorf("Status = %q, want %q", issue.Status, StatusResolved)
	}
	if issue.UpdatedAt.IsZero() {
		t.Error("UpdatedAt should be set")
	}
}
