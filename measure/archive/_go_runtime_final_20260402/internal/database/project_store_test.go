package database

import (
	"path/filepath"
	"testing"
)

func TestProjectStoreSaveAndGet(t *testing.T) {
	dir := t.TempDir()
	db, err := New(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	store := NewProjectStore(db)
	project := &Project{
		ID:   "proj-1",
		Name: "Test Project",
		Path: "/tmp/test",
	}

	if err := store.Save(project); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	got, err := store.Get("proj-1")
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	if got.Name != "Test Project" {
		t.Errorf("Name = %q, want %q", got.Name, "Test Project")
	}
}

func TestProjectStoreList(t *testing.T) {
	dir := t.TempDir()
	db, err := New(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	store := NewProjectStore(db)
	projects := []Project{
		{ID: "proj-1", Name: "Project A", Path: "/tmp/a"},
		{ID: "proj-2", Name: "Project B", Path: "/tmp/b"},
	}

	for _, p := range projects {
		store.Save(&p)
	}

	list, err := store.List()
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(list) != 2 {
		t.Errorf("len(list) = %d, want 2", len(list))
	}
}

func TestProjectStoreDelete(t *testing.T) {
	dir := t.TempDir()
	db, err := New(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	store := NewProjectStore(db)
	store.Save(&Project{ID: "delete-me", Name: "To Delete", Path: "/tmp"})

	if err := store.Delete("delete-me"); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	got, _ := store.Get("delete-me")
	if got != nil {
		t.Error("Get after delete should return nil")
	}
}

func TestTaskStoreSaveAndGet(t *testing.T) {
	dir := t.TempDir()
	db, err := New(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	store := NewTaskStore(db)
	task := &Task{
		ID:          "task-1",
		TrackID:     "track-1",
		Phase:       "Phase 1",
		Description: "Test task",
		Status:      "todo",
		AgentTag:    "senior-backend",
	}

	if err := store.Save(task); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	got, err := store.Get("task-1")
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	if got.Description != "Test task" {
		t.Errorf("Description = %q, want %q", got.Description, "Test task")
	}
}

func TestTaskStoreListByStatus(t *testing.T) {
	dir := t.TempDir()
	db, err := New(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	store := NewTaskStore(db)
	tasks := []Task{
		{ID: "task-1", TrackID: "t1", Status: "todo"},
		{ID: "task-2", TrackID: "t1", Status: "done"},
		{ID: "task-3", TrackID: "t1", Status: "todo"},
	}

	for _, t := range tasks {
		store.Save(&t)
	}

	todoTasks, err := store.ListByStatus("todo")
	if err != nil {
		t.Fatalf("ListByStatus() error = %v", err)
	}
	if len(todoTasks) != 2 {
		t.Errorf("todo tasks = %d, want 2", len(todoTasks))
	}
}

func TestIssueStoreSaveAndGet(t *testing.T) {
	dir := t.TempDir()
	db, err := New(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	store := NewIssueStore(db)
	issue := &Issue{
		ID:          "issue-1",
		ProjectID:   "proj-1",
		Title:       "Test Issue",
		Description: "A test issue",
		Type:        "blocker",
		Status:      "open",
	}

	if err := store.Save(issue); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	got, err := store.Get("issue-1")
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if got == nil {
		t.Fatal("Get() returned nil")
	}
	if got.Title != "Test Issue" {
		t.Errorf("Title = %q, want %q", got.Title, "Test Issue")
	}
}

func TestIssueStoreListByStatus(t *testing.T) {
	dir := t.TempDir()
	db, err := New(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	store := NewIssueStore(db)
	issues := []Issue{
		{ID: "i1", ProjectID: "p1", Status: "open", Type: "blocker"},
		{ID: "i2", ProjectID: "p1", Status: "resolved", Type: "blocker"},
		{ID: "i3", ProjectID: "p1", Status: "open", Type: "clarification"},
	}

	for _, i := range issues {
		store.Save(&i)
	}

	open, err := store.ListByStatus("open")
	if err != nil {
		t.Fatalf("ListByStatus() error = %v", err)
	}
	if len(open) != 2 {
		t.Errorf("open issues = %d, want 2", len(open))
	}
}

func TestExecutionLogStoreSaveAndStats(t *testing.T) {
	dir := t.TempDir()
	db, err := New(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	store := NewExecutionLogStore(db)
	log := &ExecutionLog{
		ID:         "log-1",
		ProjectID:  "proj-1",
		TaskID:     "task-1",
		AgentName:  "senior-backend",
		Harness:    "opencode",
		Command:    "opencode",
		Status:     "success",
		DurationMs: 5000,
	}

	if err := store.Save(log); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	stats, err := store.GetStats("proj-1")
	if err != nil {
		t.Fatalf("GetStats() error = %v", err)
	}

	total, ok := stats["total"].(int64)
	if !ok || total != 1 {
		t.Errorf("total = %v, want 1", total)
	}

	rate, ok := stats["successRate"].(float64)
	if !ok || rate != 100 {
		t.Errorf("successRate = %v, want 100", rate)
	}
}

func TestExecutionLogStoreByAgent(t *testing.T) {
	dir := t.TempDir()
	db, err := New(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	store := NewExecutionLogStore(db)
	logs := []ExecutionLog{
		{ID: "l1", ProjectID: "p1", AgentName: "senior-backend", Status: "success"},
		{ID: "l2", ProjectID: "p1", AgentName: "senior-backend", Status: "success"},
		{ID: "l3", ProjectID: "p1", AgentName: "junior-dev", Status: "failed"},
	}

	for _, l := range logs {
		store.Save(&l)
	}

	byAgent, err := store.GetByAgent("p1")
	if err != nil {
		t.Fatalf("GetByAgent() error = %v", err)
	}

	if byAgent["senior-backend"] != 2 {
		t.Errorf("senior-backend count = %d, want 2", byAgent["senior-backend"])
	}
	if byAgent["junior-dev"] != 1 {
		t.Errorf("junior-dev count = %d, want 1", byAgent["junior-dev"])
	}
}
