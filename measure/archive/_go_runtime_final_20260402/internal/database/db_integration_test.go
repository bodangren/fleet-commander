package database

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewCreatesDBFile(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := New(dbPath)
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}
	defer db.Close()

	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		t.Fatal("expected database file to be created")
	}

	tables := []string{"projects", "tracks", "tasks", "issues", "execution_logs"}
	for _, table := range tables {
		var name string
		err := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table).Scan(&name)
		if err != nil {
			t.Errorf("expected table %q to exist: %v", table, err)
		}
	}
}

func TestNewRejectsEmptyPath(t *testing.T) {
	_, err := New("")
	if err == nil {
		t.Fatal("expected error for empty path")
	}
}

func TestStoresRoundTrip(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	ps := NewProjectStore(db)
	ts := NewTaskStore(db)
	is := NewIssueStore(db)
	ls := NewExecutionLogStore(db)

	// Project
	err := ps.Save(&Project{ID: "p1", Name: "Test", Path: "/tmp/test", LastUpdated: 1000})
	if err != nil {
		t.Fatalf("save project: %v", err)
	}
	p, err := ps.Get("p1")
	if err != nil || p == nil {
		t.Fatalf("get project: %v", err)
	}
	if p.Name != "Test" {
		t.Errorf("expected name 'Test', got %q", p.Name)
	}

	// Track + Tasks
	_, err = db.Exec(`INSERT INTO tracks (id, project_id, name, type, status) VALUES (?, ?, ?, ?, ?)`,
		"t1", "p1", "Track1", "feature", "pending")
	if err != nil {
		t.Fatalf("insert track: %v", err)
	}
	err = ts.Save(&Task{ID: "task1", TrackID: "t1", Phase: "Phase 1", Description: "Do thing", Status: "todo"})
	if err != nil {
		t.Fatalf("save task: %v", err)
	}
	tasks, err := ts.ListByTrack("t1")
	if err != nil || len(tasks) != 1 {
		t.Fatalf("list tasks: %v, count=%d", err, len(tasks))
	}

	// Issue
	err = is.Save(&Issue{ID: "iss1", ProjectID: "p1", Title: "Bug", Type: "blocker", Status: "open"})
	if err != nil {
		t.Fatalf("save issue: %v", err)
	}
	issues, err := is.ListByProject("p1")
	if err != nil || len(issues) != 1 {
		t.Fatalf("list issues: %v, count=%d", err, len(issues))
	}

	// Execution log
	err = ls.Save(&ExecutionLog{ID: "log1", ProjectID: "p1", Status: "success", DurationMs: 500, Timestamp: 2000})
	if err != nil {
		t.Fatalf("save log: %v", err)
	}
	logs, err := ls.ListByProject("p1", 10)
	if err != nil || len(logs) != 1 {
		t.Fatalf("list logs: %v, count=%d", err, len(logs))
	}

	stats, err := ls.GetStats("p1")
	if err != nil {
		t.Fatalf("get stats: %v", err)
	}
	if stats["total"].(int64) != 1 {
		t.Errorf("expected total=1, got %v", stats["total"])
	}
}

func newTestDB(t *testing.T) *DB {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	db, err := New(dbPath)
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	return db
}
