package database

import (
	"path/filepath"
	"testing"
)

func TestTaskStoreDelete(t *testing.T) {
	dir := t.TempDir()
	db, _ := New(filepath.Join(dir, "test.db"))
	defer db.Close()

	store := NewTaskStore(db)
	store.Save(&Task{ID: "del-task", TrackID: "t1", Status: "todo"})

	if err := store.Delete("del-task"); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	got, _ := store.Get("del-task")
	if got != nil {
		t.Error("Get after delete should return nil")
	}
}

func TestTaskStoreSaveBatch(t *testing.T) {
	dir := t.TempDir()
	db, _ := New(filepath.Join(dir, "test.db"))
	defer db.Close()

	store := NewTaskStore(db)
	tasks := []Task{
		{ID: "batch-1", TrackID: "t1", Status: "todo"},
		{ID: "batch-2", TrackID: "t1", Status: "todo"},
	}

	if err := store.SaveBatch(tasks); err != nil {
		t.Fatalf("SaveBatch() error = %v", err)
	}

	list, _ := store.ListByTrack("t1")
	if len(list) != 2 {
		t.Errorf("Saved %d tasks, want 2", len(list))
	}
}

func TestExecutionLogStoreDeleteOld(t *testing.T) {
	dir := t.TempDir()
	db, _ := New(filepath.Join(dir, "test.db"))
	defer db.Close()

	store := NewExecutionLogStore(db)
	store.Save(&ExecutionLog{ID: "l1", ProjectID: "p1", Status: "success", Timestamp: 1000})
	store.Save(&ExecutionLog{ID: "l2", ProjectID: "p1", Status: "success", Timestamp: 2000})

	// Delete logs before timestamp 1500
	if err := store.Delete("p1", 1500); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	list, _ := store.ListByProject("p1", 10)
	if len(list) != 1 {
		t.Errorf("Expected 1 log after delete, got %d", len(list))
	}
}
