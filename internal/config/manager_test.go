package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestConfigManagerLoadEmpty(t *testing.T) {
	tmpDir := t.TempDir()
	cm := NewConfigManagerWithDir(tmpDir)

	entries, err := cm.Load()
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("Expected empty entries, got %d", len(entries))
	}
}

func TestConfigManagerSaveAndLoad(t *testing.T) {
	tmpDir := t.TempDir()
	cm := NewConfigManagerWithDir(tmpDir)

	want := []ProjectEntry{
		{ID: "proj-a", Path: "/tmp/proj-a"},
		{ID: "proj-b", Path: "/tmp/proj-b"},
	}

	if err := cm.Save(want); err != nil {
		t.Fatalf("Save() failed: %v", err)
	}

	got, err := cm.Load()
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}
	if len(got) != 2 {
		t.Errorf("Expected 2 entries, got %d", len(got))
	}
	if got[0].ID != "proj-a" || got[1].ID != "proj-b" {
		t.Errorf("Unexpected entries: %+v", got)
	}
}

func TestConfigManagerAtomicWrite(t *testing.T) {
	tmpDir := t.TempDir()
	cm := NewConfigManagerWithDir(tmpDir)

	entries := []ProjectEntry{{ID: "p1", Path: "/tmp/p1"}}
	if err := cm.Save(entries); err != nil {
		t.Fatalf("Save() failed: %v", err)
	}

	// Temp file should not exist after successful write
	tmpFile := filepath.Join(tmpDir, "projects.json.tmp")
	if _, err := os.Stat(tmpFile); !os.IsNotExist(err) {
		t.Error("Expected temp file to be cleaned up")
	}
}

func TestConfigManagerAddProject(t *testing.T) {
	tmpDir := t.TempDir()
	cm := NewConfigManagerWithDir(tmpDir)

	entry := ProjectEntry{ID: "p1", Path: "/tmp/p1"}
	if err := cm.AddProject(entry); err != nil {
		t.Fatalf("AddProject() failed: %v", err)
	}

	// Adding same project again should be idempotent
	if err := cm.AddProject(entry); err != nil {
		t.Fatalf("Second AddProject() failed: %v", err)
	}

	entries, err := cm.Load()
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}
	if len(entries) != 1 {
		t.Errorf("Expected 1 entry, got %d", len(entries))
	}
}

func TestConfigManagerAddProjects(t *testing.T) {
	tmpDir := t.TempDir()
	cm := NewConfigManagerWithDir(tmpDir)

	// Pre-seed one entry
	if err := cm.Save([]ProjectEntry{{ID: "p1", Path: "/tmp/p1"}}); err != nil {
		t.Fatalf("Save() failed: %v", err)
	}

	// Add two more, one duplicate
	newEntries := []ProjectEntry{
		{ID: "p1", Path: "/tmp/p1"}, // duplicate
		{ID: "p2", Path: "/tmp/p2"},
	}
	if err := cm.AddProjects(newEntries); err != nil {
		t.Fatalf("AddProjects() failed: %v", err)
	}

	entries, err := cm.Load()
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}
	if len(entries) != 2 {
		t.Errorf("Expected 2 entries, got %d", len(entries))
	}
}
