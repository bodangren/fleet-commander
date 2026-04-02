package database

import (
	"path/filepath"
	"testing"
)

func TestProjectStoreNotFound(t *testing.T) {
	dir := t.TempDir()
	db, _ := New(filepath.Join(dir, "test.db"))
	defer db.Close()

	store := NewProjectStore(db)
	got, err := store.Get("nonexistent")
	if err != nil {
		t.Errorf("Get() error = %v", err)
	}
	if got != nil {
		t.Error("Expected nil for nonexistent project")
	}
}

func TestTaskStoreListByTrack(t *testing.T) {
	dir := t.TempDir()
	db, _ := New(filepath.Join(dir, "test.db"))
	defer db.Close()

	store := NewTaskStore(db)
	tasks := []Task{
		{ID: "t1", TrackID: "track-1", Phase: "P1", Status: "todo"},
		{ID: "t2", TrackID: "track-2", Phase: "P1", Status: "todo"},
	}
	for _, t := range tasks {
		store.Save(&t)
	}

	list, err := store.ListByTrack("track-1")
	if err != nil {
		t.Fatalf("ListByTrack() error = %v", err)
	}
	if len(list) != 1 {
		t.Errorf("len(list) = %d, want 1", len(list))
	}
}

func TestIssueStoreListByProject(t *testing.T) {
	dir := t.TempDir()
	db, _ := New(filepath.Join(dir, "test.db"))
	defer db.Close()

	store := NewIssueStore(db)
	issues := []Issue{
		{ID: "i1", ProjectID: "p1", Title: "Issue 1", Type: "blocker", Status: "open"},
		{ID: "i2", ProjectID: "p1", Title: "Issue 2", Type: "blocker", Status: "open"},
		{ID: "i3", ProjectID: "p2", Title: "Issue 3", Type: "blocker", Status: "open"},
	}
	for _, i := range issues {
		store.Save(&i)
	}

	list, err := store.ListByProject("p1")
	if err != nil {
		t.Fatalf("ListByProject() error = %v", err)
	}
	if len(list) != 2 {
		t.Errorf("len(list) = %d, want 2", len(list))
	}
}

func TestIssueStoreListByProjectAndStatus(t *testing.T) {
	dir := t.TempDir()
	db, _ := New(filepath.Join(dir, "test.db"))
	defer db.Close()

	store := NewIssueStore(db)
	issues := []Issue{
		{ID: "i1", ProjectID: "p1", Title: "I1", Status: "open"},
		{ID: "i2", ProjectID: "p1", Title: "I2", Status: "resolved"},
		{ID: "i3", ProjectID: "p1", Title: "I3", Status: "open"},
	}
	for _, i := range issues {
		store.Save(&i)
	}

	list, err := store.ListByProjectAndStatus("p1", "open")
	if err != nil {
		t.Fatalf("ListByProjectAndStatus() error = %v", err)
	}
	if len(list) != 2 {
		t.Errorf("len(list) = %d, want 2", len(list))
	}
}

func TestIssueStoreDelete(t *testing.T) {
	dir := t.TempDir()
	db, _ := New(filepath.Join(dir, "test.db"))
	defer db.Close()

	store := NewIssueStore(db)
	store.Save(&Issue{ID: "del", ProjectID: "p1", Title: "Delete", Type: "blocker", Status: "open"})

	if err := store.Delete("del"); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	got, _ := store.Get("del")
	if got != nil {
		t.Error("Get after delete should return nil")
	}
}

func TestExecutionLogStoreListByProject(t *testing.T) {
	dir := t.TempDir()
	db, _ := New(filepath.Join(dir, "test.db"))
	defer db.Close()

	store := NewExecutionLogStore(db)
	logs := []ExecutionLog{
		{ID: "l1", ProjectID: "p1", Status: "success"},
		{ID: "l2", ProjectID: "p1", Status: "success"},
		{ID: "l3", ProjectID: "p2", Status: "failed"},
	}
	for _, l := range logs {
		store.Save(&l)
	}

	list, err := store.ListByProject("p1", 10)
	if err != nil {
		t.Fatalf("ListByProject() error = %v", err)
	}
	if len(list) != 2 {
		t.Errorf("len(list) = %d, want 2", len(list))
	}
}

func TestExecutionLogStoreEmptyStats(t *testing.T) {
	dir := t.TempDir()
	db, _ := New(filepath.Join(dir, "test.db"))
	defer db.Close()

	store := NewExecutionLogStore(db)
	stats, err := store.GetStats("no-project")
	if err != nil {
		t.Fatalf("GetStats() error = %v", err)
	}

	if stats["total"].(int64) != 0 {
		t.Error("Expected 0 total for empty project")
	}
	if stats["successRate"].(float64) != 0 {
		t.Error("Expected 0% success rate for empty project")
	}
}
