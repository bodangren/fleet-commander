package review

import (
	"context"
	"testing"
)

func TestStore_SaveAndGetHistory(t *testing.T) {
	store := NewStore()
	result := &ReviewResult{
		Status: "needs-changes",
		Comments: []ReviewComment{
			{File: "main.go", Line: 10, Severity: "high", Message: "missing validation"},
		},
	}

	err := store.Save(context.Background(), "task-1", result, DepthQuick)
	if err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	history, err := store.GetHistory(context.Background(), "task-1")
	if err != nil {
		t.Fatalf("GetHistory failed: %v", err)
	}
	if len(history) != 1 {
		t.Fatalf("expected 1 record, got %d", len(history))
	}
	if history[0].Status != "needs-changes" {
		t.Errorf("status = %q, want %q", history[0].Status, "needs-changes")
	}
	if history[0].Depth != "quick" {
		t.Errorf("depth = %q, want %q", history[0].Depth, "quick")
	}
	if history[0].TaskID != "task-1" {
		t.Errorf("taskID = %q, want %q", history[0].TaskID, "task-1")
	}
}

func TestStore_MultipleReviewsSameTask(t *testing.T) {
	store := NewStore()
	result1 := &ReviewResult{Status: "needs-changes", Comments: []ReviewComment{{File: "a.go", Line: 1, Severity: "high", Message: "fix this"}}}
	result2 := &ReviewResult{Status: "pass", Comments: []ReviewComment{}}

	_ = store.Save(context.Background(), "task-1", result1, DepthQuick)
	_ = store.Save(context.Background(), "task-1", result2, DepthThorough)

	history, err := store.GetHistory(context.Background(), "task-1")
	if err != nil {
		t.Fatalf("GetHistory failed: %v", err)
	}
	if len(history) != 2 {
		t.Fatalf("expected 2 records, got %d", len(history))
	}
	if history[0].Status != "needs-changes" {
		t.Errorf("first record status = %q, want %q", history[0].Status, "needs-changes")
	}
	if history[1].Status != "pass" {
		t.Errorf("second record status = %q, want %q", history[1].Status, "pass")
	}
}

func TestStore_EmptyHistory(t *testing.T) {
	store := NewStore()
	history, err := store.GetHistory(context.Background(), "nonexistent")
	if err != nil {
		t.Fatalf("GetHistory failed: %v", err)
	}
	if history == nil {
		t.Error("expected empty slice, got nil")
	}
	if len(history) != 0 {
		t.Errorf("expected 0 records, got %d", len(history))
	}
}

func TestCreateSubTasks(t *testing.T) {
	comments := []ReviewComment{
		{File: "auth.go", Line: 12, Severity: "high", Message: "Missing input validation"},
		{File: "auth.go", Line: 20, Severity: "medium", Message: "Use prepared statements"},
	}

	subTasks := CreateSubTasks("task-42", comments)

	if len(subTasks) != 2 {
		t.Fatalf("expected 2 sub-tasks, got %d", len(subTasks))
	}
	if subTasks[0].ParentTaskID != "task-42" {
		t.Errorf("parentTaskID = %q, want %q", subTasks[0].ParentTaskID, "task-42")
	}
	if subTasks[0].Severity != "high" {
		t.Errorf("severity = %q, want %q", subTasks[0].Severity, "high")
	}
	if subTasks[0].Description == "" {
		t.Error("description should not be empty")
	}
}

func TestCreateSubTasks_EmptyComments(t *testing.T) {
	subTasks := CreateSubTasks("task-1", nil)
	if len(subTasks) != 0 {
		t.Errorf("expected 0 sub-tasks for nil comments, got %d", len(subTasks))
	}
}

func TestApplyReviewResult_NeedsChanges(t *testing.T) {
	store := NewStore()
	result := &ReviewResult{
		Status: "needs-changes",
		Comments: []ReviewComment{
			{File: "main.go", Line: 5, Severity: "high", Message: "bug"},
		},
	}

	subTasks, blocked, err := ApplyReviewResult("task-1", result, DepthQuick, store)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !blocked {
		t.Error("task should be blocked when review needs changes")
	}
	if len(subTasks) != 1 {
		t.Fatalf("expected 1 sub-task, got %d", len(subTasks))
	}

	history, _ := store.GetHistory(context.Background(), "task-1")
	if len(history) != 1 {
		t.Errorf("expected 1 history record, got %d", len(history))
	}
}

func TestApplyReviewResult_Pass(t *testing.T) {
	store := NewStore()
	result := &ReviewResult{Status: "pass", Comments: []ReviewComment{}}

	subTasks, blocked, err := ApplyReviewResult("task-1", result, DepthQuick, store)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if blocked {
		t.Error("task should not be blocked when review passes")
	}
	if len(subTasks) != 0 {
		t.Errorf("expected 0 sub-tasks for pass, got %d", len(subTasks))
	}
}

func TestApplyReviewResult_NilStore(t *testing.T) {
	result := &ReviewResult{Status: "pass"}
	_, _, err := ApplyReviewResult("task-1", result, DepthQuick, nil)
	if err == nil {
		t.Error("expected error for nil store")
	}
}
