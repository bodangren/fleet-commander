package parser

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/conductor/fleet-commander/internal/models"
)

func TestParseTracksRegistry(t *testing.T) {
	content := `# Tracks Registry

---

## Active Tracks

- [~] Track: Core Go File Watcher & Markdown Parser Engine
      _Link: [./tracks/go_file_watcher_parser_20260324/](./tracks/go_file_watcher_parser_20260324/)_
- [ ] Track: CLI Process Manager & Execution Engine
      _Link: [./tracks/cli_process_manager_20260324/](./tracks/cli_process_manager_20260324/)_

---

## Archived Tracks

- [x] Track: Daily Refactor & Cleanup
      _Link: [./archive/daily_refactor_20260324/](./archive/daily_refactor_20260324/)_
`

	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "tracks.md")
	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	tracks, err := ParseTracksRegistry(testFile)
	if err != nil {
		t.Fatalf("ParseTracksRegistry failed: %v", err)
	}

	if len(tracks) != 2 {
		t.Errorf("Expected 2 active tracks, got %d", len(tracks))
	}

	if tracks[0].Status != "active" {
		t.Errorf("Expected first track status 'active', got '%s'", tracks[0].Status)
	}

	if tracks[1].Status != "todo" {
		t.Errorf("Expected second track status 'todo', got '%s'", tracks[1].Status)
	}
}

func TestParsePlan(t *testing.T) {
	content := `# Implementation Plan - Core Engine & Parser

## Phase 1: Models & Registry
- [x] Task: Create models package
- [ ] Task: Create ProjectManager

## Phase 2: Markdown Parsing
- [~] Task: Write ParseTracksRegistry @parser
- [ ] Task: Write ParsePlan @parser
`

	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "plan.md")
	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	phases, err := ParsePlan(testFile)
	if err != nil {
		t.Fatalf("ParsePlan failed: %v", err)
	}

	if len(phases) != 2 {
		t.Errorf("Expected 2 phases, got %d", len(phases))
	}

	if phases[0].Name != "Phase 1: Models & Registry" {
		t.Errorf("Expected phase name 'Phase 1: Models & Registry', got '%s'", phases[0].Name)
	}

	if len(phases[0].Tasks) != 2 {
		t.Errorf("Expected 2 tasks in phase 1, got %d", len(phases[0].Tasks))
	}

	if phases[0].Tasks[0].Status != models.StatusDone {
		t.Errorf("Expected first task status 'done', got '%s'", phases[0].Tasks[0].Status)
	}

	if phases[1].Tasks[0].AgentTag != "parser" {
		t.Errorf("Expected agent tag 'parser', got '%s'", phases[1].Tasks[0].AgentTag)
	}

	if phases[1].Tasks[0].ID != "phase-2-markdown-parsing-1" {
		t.Errorf("Expected generated task id 'phase-2-markdown-parsing-1', got '%s'", phases[1].Tasks[0].ID)
	}
}

func TestWritePlanStatusByID(t *testing.T) {
	content := `# Implementation Plan - Duplicate Task Safety

## Phase 1: Duplicate Tasks
- [ ] Task: Finish the workflow
- [ ] Task: Finish the workflow
- [ ] Task: Ship the release
`

	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "plan.md")
	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	if err := WritePlanStatusByID(testFile, "phase-1-duplicate-tasks-2", models.StatusDone); err != nil {
		t.Fatalf("WritePlanStatusByID failed: %v", err)
	}

	updated, err := os.ReadFile(testFile)
	if err != nil {
		t.Fatalf("Failed to read updated plan file: %v", err)
	}

	lines := strings.Split(string(updated), "\n")
	if lines[3] != "- [ ] Task: Finish the workflow" {
		t.Fatalf("expected first duplicate task to remain unchanged, got %q", lines[3])
	}
	if lines[4] != "- [x] Task: Finish the workflow" {
		t.Fatalf("expected second duplicate task to be marked done, got %q", lines[4])
	}
}
