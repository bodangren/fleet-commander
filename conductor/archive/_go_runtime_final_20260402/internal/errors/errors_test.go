package errors

import (
	"fmt"
	"testing"
)

func TestParseErrorImplementsError(t *testing.T) {
	cause := fmt.Errorf("unexpected token")
	err := &ParseError{
		Project: "my-project",
		File:    "plan.md",
		Cause:   cause,
	}

	var _ error = err // compile-time check

	msg := err.Error()
	if msg == "" {
		t.Fatal("expected non-empty error message")
	}

	if err.Project != "my-project" {
		t.Errorf("expected project %q, got %q", "my-project", err.Project)
	}
	if err.File != "plan.md" {
		t.Errorf("expected file %q, got %q", "plan.md", err.File)
	}
	if err.Unwrap() != cause {
		t.Error("Unwrap did not return the original cause")
	}
}

func TestExecutionErrorImplementsError(t *testing.T) {
	cause := fmt.Errorf("process killed")
	err := &ExecutionError{
		Project: "my-project",
		TaskID:  "phase-1-task-1",
		Type:    "timeout",
		Cause:   cause,
	}

	var _ error = err // compile-time check

	msg := err.Error()
	if msg == "" {
		t.Fatal("expected non-empty error message")
	}

	if err.Project != "my-project" {
		t.Errorf("expected project %q, got %q", "my-project", err.Project)
	}
	if err.TaskID != "phase-1-task-1" {
		t.Errorf("expected taskID %q, got %q", "phase-1-task-1", err.TaskID)
	}
	if err.Type != "timeout" {
		t.Errorf("expected type %q, got %q", "timeout", err.Type)
	}
	if err.Unwrap() != cause {
		t.Error("Unwrap did not return the original cause")
	}
}

func TestExecutionErrorCarriesMetadata(t *testing.T) {
	tests := []struct {
		name    string
		errType string
		project string
		taskID  string
	}{
		{"timeout error", "timeout", "proj-a", "task-1"},
		{"crash error", "crash", "proj-b", "task-2"},
		{"binary missing", "binary_missing", "proj-c", "task-3"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := &ExecutionError{
				Project: tt.project,
				TaskID:  tt.taskID,
				Type:    tt.errType,
				Cause:   fmt.Errorf("test"),
			}
			if err.Project != tt.project {
				t.Errorf("project mismatch: got %q, want %q", err.Project, tt.project)
			}
			if err.TaskID != tt.taskID {
				t.Errorf("taskID mismatch: got %q, want %q", err.TaskID, tt.taskID)
			}
			if err.Type != tt.errType {
				t.Errorf("type mismatch: got %q, want %q", err.Type, tt.errType)
			}
		})
	}
}

func TestIsRecoverable(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{"nil error", nil, false},
		{"plain error", fmt.Errorf("random"), false},
		{"parse error", &ParseError{Cause: fmt.Errorf("io")}, true},
		{"timeout execution", &ExecutionError{Type: "timeout", Cause: fmt.Errorf("t")}, true},
		{"crash execution", &ExecutionError{Type: "crash", Cause: fmt.Errorf("c")}, true},
		{"binary missing", &ExecutionError{Type: "binary_missing", Cause: fmt.Errorf("b")}, false},
		{"unknown execution type", &ExecutionError{Type: "unknown", Cause: fmt.Errorf("u")}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsRecoverable(tt.err)
			if got != tt.expected {
				t.Errorf("IsRecoverable() = %v, want %v", got, tt.expected)
			}
		})
	}
}
