package database

import (
	"os"
	"path/filepath"
	"testing"
)

func TestMigrateProjectBasic(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	// Create a sample project filesystem
	projectDir := t.TempDir()
	measureDir := filepath.Join(projectDir, "measure")
	os.MkdirAll(filepath.Join(measureDir, "tracks", "test_track"), 0755)

	// Write tracks.md
	tracksContent := `# Tracks Registry

---

## Active Tracks

- [ ] **Track: Test Feature**
      _Link: [./tracks/test_track/](./tracks/test_track/)_
`
	os.WriteFile(filepath.Join(measureDir, "tracks.md"), []byte(tracksContent), 0644)

	// Write plan.md
	planContent := `# Implementation Plan - Test Feature

## Phase 1: Setup

- [ ] Task: Write tests for setup
- [ ] Task: Implement setup logic
`
	os.WriteFile(filepath.Join(measureDir, "tracks", "test_track", "plan.md"), []byte(planContent), 0644)

	// Write an issue
	issueDir := filepath.Join(measureDir, "broker", "open")
	os.MkdirAll(issueDir, 0755)
	issueContent := `---
title: Test Bug
type: blocker
status: open
---

# Test Bug

Something is broken.
`
	os.WriteFile(filepath.Join(issueDir, "BLK-001.md"), []byte(issueContent), 0644)

	migrator := NewMigrator(db, false)
	result, err := migrator.MigrateProject(projectDir)
	if err != nil {
		t.Fatalf("MigrateProject() failed: %v", err)
	}

	if result.ProjectsImported != 1 {
		t.Errorf("expected 1 project imported, got %d", result.ProjectsImported)
	}
	if result.TasksImported != 2 {
		t.Errorf("expected 2 tasks imported, got %d", result.TasksImported)
	}
	if result.IssuesImported != 1 {
		t.Errorf("expected 1 issue imported, got %d", result.IssuesImported)
	}
	if len(result.Errors) > 0 {
		t.Errorf("unexpected errors: %v", result.Errors)
	}
}

func TestMigrateProjectNoConductorDir(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	migrator := NewMigrator(db, false)
	_, err := migrator.MigrateProject(t.TempDir())
	if err == nil {
		t.Fatal("expected error for missing measure directory")
	}
}

func TestMigrateProjectForceSkipsBadProjects(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	projectDir := t.TempDir()
	measureDir := filepath.Join(projectDir, "measure")
	os.MkdirAll(measureDir, 0755)

	// Write invalid tracks.md (will parse but yield no tracks)
	os.WriteFile(filepath.Join(measureDir, "tracks.md"), []byte("not valid"), 0644)

	migrator := NewMigrator(db, true)
	result, err := migrator.MigrateProject(projectDir)
	if err != nil {
		t.Fatalf("MigrateProject() with force should not fail: %v", err)
	}
	if result.ProjectsImported != 1 {
		t.Errorf("expected 1 project imported, got %d", result.ProjectsImported)
	}
}

func TestParseIssueFrontmatter(t *testing.T) {
	content := `---
title: My Issue
relatedTask: task-123
---

# My Issue

Description here.
`
	title, desc, related := parseIssueFrontmatter(content)
	if title != "My Issue" {
		t.Errorf("expected title 'My Issue', got %q", title)
	}
	if related != "task-123" {
		t.Errorf("expected relatedTask 'task-123', got %q", related)
	}
	if desc == "" {
		t.Error("expected non-empty description")
	}
}
