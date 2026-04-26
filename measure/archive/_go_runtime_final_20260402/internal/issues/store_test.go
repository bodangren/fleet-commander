package issues

import (
	"testing"
	"time"
)

func TestStoreSaveAndGet(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	issue := &Issue{
		ID:          "issue-123",
		Title:       "Test issue",
		Description: "Test description",
		Type:        TypeBlocker,
		Status:      StatusOpen,
		CreatedAt:   time.Now(),
	}

	err := store.Save(issue)
	if err != nil {
		t.Errorf("Save error = %v", err)
	}

	got, err := store.Get("issue-123")
	if err != nil {
		t.Errorf("Get error = %v", err)
	}
	if got == nil {
		t.Fatal("Get returned nil")
	}
	if got.Title != "Test issue" {
		t.Errorf("Title = %q, want %q", got.Title, "Test issue")
	}
	if got.Type != TypeBlocker {
		t.Errorf("Type = %q, want %q", got.Type, TypeBlocker)
	}
}

func TestStoreList(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	issues := []*Issue{
		{ID: "issue-1", Title: "Issue 1", Status: StatusOpen},
		{ID: "issue-2", Title: "Issue 2", Status: StatusResolved},
		{ID: "issue-3", Title: "Issue 3", Status: StatusOpen},
	}

	for _, issue := range issues {
		issue.CreatedAt = time.Now()
		if err := store.Save(issue); err != nil {
			t.Fatalf("Save error = %v", err)
		}
	}

	list, err := store.List()
	if err != nil {
		t.Errorf("List error = %v", err)
	}
	if len(list) != 3 {
		t.Errorf("len(list) = %d, want 3", len(list))
	}
}

func TestStoreListByStatus(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	issues := []*Issue{
		{ID: "issue-1", Title: "Issue 1", Status: StatusOpen},
		{ID: "issue-2", Title: "Issue 2", Status: StatusResolved},
	}

	for _, issue := range issues {
		issue.CreatedAt = time.Now()
		if err := store.Save(issue); err != nil {
			t.Fatalf("Save error = %v", err)
		}
	}

	open, err := store.ListByStatus(StatusOpen)
	if err != nil {
		t.Errorf("ListByStatus error = %v", err)
	}
	if len(open) != 1 {
		t.Errorf("open issues = %d, want 1", len(open))
	}

	resolved, err := store.ListByStatus(StatusResolved)
	if err != nil {
		t.Errorf("ListByStatus error = %v", err)
	}
	if len(resolved) != 1 {
		t.Errorf("resolved issues = %d, want 1", len(resolved))
	}
}

func TestStoreDelete(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	issue := &Issue{
		ID:        "issue-to-delete",
		Title:     "Delete me",
		Status:    StatusOpen,
		CreatedAt: time.Now(),
	}
	if err := store.Save(issue); err != nil {
		t.Fatalf("Save error = %v", err)
	}

	if err := store.Delete("issue-to-delete"); err != nil {
		t.Errorf("Delete error = %v", err)
	}

	got, _ := store.Get("issue-to-delete")
	if got != nil {
		t.Error("Get after delete should return nil")
	}
}

func TestStoreGetNotFound(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	got, err := store.Get("nonexistent")
	if err != nil {
		t.Errorf("Get error = %v", err)
	}
	if got != nil {
		t.Error("Get non-existent should return nil")
	}
}

func TestStoreListEmptyDir(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	list, err := store.List()
	if err != nil {
		t.Errorf("List error = %v", err)
	}
	if len(list) != 0 {
		t.Errorf("empty dir should have 0 issues, got %d", len(list))
	}
}

func TestStoreUpdateStatus(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	issue := &Issue{
		ID:        "issue-update",
		Title:     "Update status",
		Status:    StatusOpen,
		CreatedAt: time.Now(),
	}
	store.Save(issue)

	issue.SetStatus(StatusResolved)
	store.Save(issue)

	got, _ := store.Get("issue-update")
	if got.Status != StatusResolved {
		t.Errorf("Status = %q, want %q", got.Status, StatusResolved)
	}
}

func TestFormatIssueAsMarkdown(t *testing.T) {
	issue := &Issue{
		ID:          "issue-md",
		Title:       "Markdown Test",
		Description: "Testing markdown format",
		Type:        TypeDelegation,
		Status:      StatusOpen,
		CreatedAt:   time.Date(2026, 3, 29, 12, 0, 0, 0, time.UTC),
		RelatedTask: "phase-1-1",
	}

	content := formatIssueAsMarkdown(issue)

	if !contains(content, "---") {
		t.Error("should have front matter delimiter")
	}
	if !contains(content, "title: Markdown Test") {
		t.Error("should have title in front matter")
	}
	if !contains(content, "type: delegation") {
		t.Error("should have type in front matter")
	}
	if !contains(content, "# Markdown Test") {
		t.Error("should have title as heading")
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && (s[:len(substr)] == substr || contains(s[1:], substr)))
}
