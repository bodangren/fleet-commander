package logs

import (
	"strings"
	"testing"
	"time"
)

func TestLogEntryTypes(t *testing.T) {
	if TypeDispatch != "dispatch" {
		t.Errorf("TypeDispatch = %q, want %q", TypeDispatch, "dispatch")
	}
	if TypeScoring != "scoring" {
		t.Errorf("TypeScoring = %q, want %q", TypeScoring, "scoring")
	}
	if TypeExecution != "execution" {
		t.Errorf("TypeExecution = %q, want %q", TypeExecution, "execution")
	}
	if TypeCompletion != "completion" {
		t.Errorf("TypeCompletion = %q, want %q", TypeCompletion, "completion")
	}
}

func TestLogEntryFields(t *testing.T) {
	now := time.Now()
	entry := LogEntry{
		Type:      TypeDispatch,
		ProjectID: "proj-1",
		Timestamp: now,
		Data: DispatchData{
			TaskID:    "task-1",
			Score:     8.5,
			TaskCount: 5,
		},
	}

	if entry.Type != TypeDispatch {
		t.Errorf("Type = %q, want %q", entry.Type, TypeDispatch)
	}
	if entry.ProjectID != "proj-1" {
		t.Errorf("ProjectID = %q, want %q", entry.ProjectID, "proj-1")
	}
	if !entry.Timestamp.Equal(now) {
		t.Errorf("Timestamp = %v, want %v", entry.Timestamp, now)
	}
}

func TestLogEntryToJSON(t *testing.T) {
	entry := NewLogEntry(TypeDispatch, "proj-1")
	entry.SetData(DispatchData{
		TaskID:    "task-1",
		Score:     7.0,
		TaskCount: 3,
	})

	data, err := entry.ToJSON()
	if err != nil {
		t.Errorf("ToJSON error = %v", err)
	}

	if len(data) < 10 {
		t.Errorf("JSON output too short: %s", string(data))
	}

	if !strings.Contains(string(data), "dispatch") {
		t.Error("should contain type")
	}
	if !strings.Contains(string(data), "task-1") {
		t.Error("should contain task id")
	}
}

func TestLogEntryFromJSON(t *testing.T) {
	jsonData := `{"type":"dispatch","projectId":"proj-1","timestamp":"2026-01-01T00:00:00Z","data":{"taskId":"task-1","score":8.5}}`

	entry, err := LogEntryFromJSON([]byte(jsonData))
	if err != nil {
		t.Errorf("FromJSON error = %v", err)
	}

	if entry.Type != TypeDispatch {
		t.Errorf("Type = %q, want %q", entry.Type, TypeDispatch)
	}
	if entry.ProjectID != "proj-1" {
		t.Errorf("ProjectID = %q, want %q", entry.ProjectID, "proj-1")
	}
}

func TestDispatchData(t *testing.T) {
	dispatch := DispatchData{
		TaskID:    "phase-1-1",
		TaskTitle: "Implement user model",
		AgentTag:  "senior-backend",
		Score:     9.0,
		Rationale: "High priority backend work",
		TaskCount: 10,
	}

	if dispatch.TaskID != "phase-1-1" {
		t.Errorf("TaskID = %q, want %q", dispatch.TaskID, "phase-1-1")
	}
	if dispatch.Score != 9.0 {
		t.Errorf("Score = %f, want %f", dispatch.Score, 9.0)
	}
	if dispatch.AgentTag != "senior-backend" {
		t.Errorf("AgentTag = %q, want %q", dispatch.AgentTag, "senior-backend")
	}
}

func TestExecutionData(t *testing.T) {
	exec := ExecutionData{
		TaskID:     "task-1",
		AgentName:  "senior-backend",
		Harness:    "opencode",
		Command:    "opencode",
		Args:       []string{"--model", "claude-3"},
		Status:     "success",
		DurationMs: 5000,
	}

	if exec.Status != "success" {
		t.Errorf("Status = %q, want %q", exec.Status, "success")
	}
	if exec.DurationMs != 5000 {
		t.Errorf("DurationMs = %d, want %d", exec.DurationMs, 5000)
	}
}
