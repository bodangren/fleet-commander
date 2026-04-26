package parser

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSafeParsePlan_ValidFile(t *testing.T) {
	content := `# Plan

## Phase 1: Setup
- [x] Task: Initialize project
- [ ] Task: Add dependencies
`
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "plan.md")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	phases, err := SafeParsePlan(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(phases) != 1 {
		t.Fatalf("expected 1 phase, got %d", len(phases))
	}
	if len(phases[0].Tasks) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(phases[0].Tasks))
	}
}

func TestSafeParsePlan_MissingFile(t *testing.T) {
	_, err := SafeParsePlan("/nonexistent/path/plan.md")
	if err == nil {
		t.Fatal("expected error for missing file")
	}
}

func TestSafeParseTracksRegistry_ValidFile(t *testing.T) {
	content := `# Tracks

## Active Tracks

- [~] Track: My Feature
      _Link: [./tracks/my_feature/](./tracks/my_feature/)_
`
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "tracks.md")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	tracks, err := SafeParseTracksRegistry(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tracks) != 1 {
		t.Fatalf("expected 1 track, got %d", len(tracks))
	}
}

func TestSafeParseTracksRegistry_MissingFile(t *testing.T) {
	_, err := SafeParseTracksRegistry("/nonexistent/tracks.md")
	if err == nil {
		t.Fatal("expected error for missing file")
	}
}

func TestParsePlanWithRetry_SucceedsFirstTry(t *testing.T) {
	content := `# Plan

## Phase 1: Init
- [ ] Task: Do something
`
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "plan.md")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	phases, err := ParsePlanWithRetry(path, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(phases) != 1 {
		t.Fatalf("expected 1 phase, got %d", len(phases))
	}
}

func TestParsePlanWithRetry_FailsAllRetries(t *testing.T) {
	_, err := ParsePlanWithRetry("/nonexistent/plan.md", 2)
	if err == nil {
		t.Fatal("expected error after exhausting retries")
	}
	if !strings.Contains(err.Error(), "failed after 2 retries") {
		t.Errorf("expected retry exhaustion message, got: %v", err)
	}
}

func TestParsePlanWithRetry_SucceedsAfterFileCreated(t *testing.T) {
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "plan.md")

	// Create the file before first attempt (simulating a transient issue resolving)
	content := `# Plan

## Phase 1: Recovery
- [ ] Task: Recovered task
`
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	phases, err := ParsePlanWithRetry(path, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(phases) != 1 {
		t.Fatalf("expected 1 phase, got %d", len(phases))
	}
}

func TestParseTracksRegistryWithRetry_FailsAllRetries(t *testing.T) {
	_, err := ParseTracksRegistryWithRetry("/nonexistent/tracks.md", 1)
	if err == nil {
		t.Fatal("expected error after exhausting retries")
	}
	if !strings.Contains(err.Error(), "failed after 1 retries") {
		t.Errorf("expected retry exhaustion message, got: %v", err)
	}
}
