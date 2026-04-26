package parser

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/measure/fleet-commander/internal/models"
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

func TestResolvePlanPath(t *testing.T) {
	tests := []struct {
		name        string
		projectPath string
		planPath    string
		expected    string
	}{
		{
			name:        "directory reference appends plan.md",
			projectPath: "/home/user/project",
			planPath:    "./tracks/foo/",
			expected:    "/home/user/project/measure/./tracks/foo/plan.md",
		},
		{
			name:        "directory reference without trailing slash",
			projectPath: "/home/user/project",
			planPath:    "./tracks/foo",
			expected:    "/home/user/project/measure/./tracks/foo/plan.md",
		},
		{
			name:        "absolute path to md file",
			projectPath: "/home/user/project",
			planPath:    "/tmp/other/plan.md",
			expected:    "/tmp/other/plan.md",
		},
		{
			name:        "relative path to md file",
			projectPath: "/home/user/project",
			planPath:    "./tracks/bar/plan.md",
			expected:    "/home/user/project/measure/./tracks/bar/plan.md",
		},
		{
			name:        "archive path with trailing slash",
			projectPath: "/home/user/project",
			planPath:    "./archive/my_track/",
			expected:    "/home/user/project/measure/./archive/my_track/plan.md",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ResolvePlanPath(tt.projectPath, tt.planPath)
			if result != tt.expected {
				t.Errorf("ResolvePlanPath(%q, %q) = %q, want %q",
					tt.projectPath, tt.planPath, result, tt.expected)
			}
		})
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

func TestParsePlanWithDependencies(t *testing.T) {
	content := `# Implementation Plan - Dependencies Test

## Phase 1: Setup
- [ ] Task: Create base module
- [ ] Task: Add configuration depends_on: phase-1-setup-1

## Phase 2: Advanced
- [ ] Task: Complex feature depends_on: phase-1-setup-1, phase-1-setup-2
- [ ] Task: Independent task
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
		t.Fatalf("Expected 2 phases, got %d", len(phases))
	}

	// Task with single dependency
	task1 := phases[0].Tasks[1]
	if task1.ID != "phase-1-setup-2" {
		t.Errorf("Expected task ID 'phase-1-setup-2', got '%s'", task1.ID)
	}
	if len(task1.Dependencies) != 1 {
		t.Fatalf("Expected 1 dependency, got %d", len(task1.Dependencies))
	}
	if task1.Dependencies[0] != "phase-1-setup-1" {
		t.Errorf("Expected dependency 'phase-1-setup-1', got '%s'", task1.Dependencies[0])
	}

	// Task with multiple dependencies
	task2 := phases[1].Tasks[0]
	if len(task2.Dependencies) != 2 {
		t.Fatalf("Expected 2 dependencies, got %d", len(task2.Dependencies))
	}
	if task2.Dependencies[0] != "phase-1-setup-1" {
		t.Errorf("Expected first dependency 'phase-1-setup-1', got '%s'", task2.Dependencies[0])
	}
	if task2.Dependencies[1] != "phase-1-setup-2" {
		t.Errorf("Expected second dependency 'phase-1-setup-2', got '%s'", task2.Dependencies[1])
	}

	// Task with no dependencies
	task3 := phases[1].Tasks[1]
	if len(task3.Dependencies) != 0 {
		t.Errorf("Expected 0 dependencies, got %d", len(task3.Dependencies))
	}
}

func TestParsePlanMalformedDependencies(t *testing.T) {
	content := `# Test Plan

## Phase 1
- [ ] Task: Bad depends_on depends_on:
- [ ] Task: Empty depends_on depends_on:  
- [ ] Task: Normal task
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

	// Malformed depends_on should result in empty dependencies
	if len(phases[0].Tasks[0].Dependencies) != 0 {
		t.Errorf("Expected empty dependencies for malformed input, got %v", phases[0].Tasks[0].Dependencies)
	}
	if len(phases[0].Tasks[1].Dependencies) != 0 {
		t.Errorf("Expected empty dependencies for empty depends_on, got %v", phases[0].Tasks[1].Dependencies)
	}
}

func TestWritePlanPreservesDependencies(t *testing.T) {
	content := `# Test Plan

## Phase 1
- [ ] Task: Feature A depends_on: phase-1-1
- [ ] Task: Feature B
`

	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "plan.md")
	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	if err := WritePlanStatusByID(testFile, "phase-1-1", models.StatusDone); err != nil {
		t.Fatalf("WritePlanStatusByID failed: %v", err)
	}

	updated, err := os.ReadFile(testFile)
	if err != nil {
		t.Fatalf("Failed to read updated plan file: %v", err)
	}

	// Verify the depends_on metadata is preserved
	if !strings.Contains(string(updated), "depends_on: phase-1-1") {
		t.Errorf("Expected depends_on metadata to be preserved, got:\n%s", string(updated))
	}
	// Verify the checkbox was updated
	if !strings.Contains(string(updated), "- [x] Task: Feature A") {
		t.Errorf("Expected task to be marked done, got:\n%s", string(updated))
	}
}
