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

func TestLoadAppConfigDefault(t *testing.T) {
	tmpDir := t.TempDir()
	cm := NewConfigManagerWithDir(tmpDir)

	cfg, err := cm.LoadAppConfig()
	if err != nil {
		t.Fatalf("LoadAppConfig() failed: %v", err)
	}
	if cfg.General.OrchestratorInterval != 30 {
		t.Errorf("Expected default interval 30, got %d", cfg.General.OrchestratorInterval)
	}
	if cfg.General.LogRetentionDays != 30 {
		t.Errorf("Expected default retention 30, got %d", cfg.General.LogRetentionDays)
	}
	if cfg.Harness.CacheTTL != 300 {
		t.Errorf("Expected default cache TTL 300, got %d", cfg.Harness.CacheTTL)
	}
	if cfg.WebSocket.ReconnectInterval != 5000 {
		t.Errorf("Expected default reconnect 5000, got %d", cfg.WebSocket.ReconnectInterval)
	}
}

func TestSaveAndLoadAppConfig(t *testing.T) {
	tmpDir := t.TempDir()
	cm := NewConfigManagerWithDir(tmpDir)

	cfg := &AppConfig{
		General: GeneralConfig{
			DefaultAgent:         "senior-frontend",
			OrchestratorInterval: 60,
			LogRetentionDays:     14,
		},
		Harness: HarnessConfig{
			CacheTTL:       120,
			DefaultHarness: "claude",
		},
		WebSocket: WebSocketConfig{
			ReconnectInterval: 3000,
		},
	}

	if err := cm.SaveAppConfig(cfg); err != nil {
		t.Fatalf("SaveAppConfig() failed: %v", err)
	}

	loaded, err := cm.LoadAppConfig()
	if err != nil {
		t.Fatalf("LoadAppConfig() failed: %v", err)
	}
	if loaded.General.DefaultAgent != "senior-frontend" {
		t.Errorf("Expected agent 'senior-frontend', got %q", loaded.General.DefaultAgent)
	}
	if loaded.General.OrchestratorInterval != 60 {
		t.Errorf("Expected interval 60, got %d", loaded.General.OrchestratorInterval)
	}
	if loaded.Harness.CacheTTL != 120 {
		t.Errorf("Expected cache TTL 120, got %d", loaded.Harness.CacheTTL)
	}
}

func TestAppConfigValidation(t *testing.T) {
	cfg := DefaultAppConfig()
	if err := cfg.Validate(); err != nil {
		t.Errorf("Default config should be valid: %v", err)
	}

	cfg.General.OrchestratorInterval = -1
	if err := cfg.Validate(); err == nil {
		t.Error("Expected validation error for negative interval")
	}

	cfg = DefaultAppConfig()
	cfg.General.LogRetentionDays = -5
	if err := cfg.Validate(); err == nil {
		t.Error("Expected validation error for negative retention")
	}

	cfg = DefaultAppConfig()
	cfg.Harness.CacheTTL = -1
	if err := cfg.Validate(); err == nil {
		t.Error("Expected validation error for negative cache TTL")
	}
}

func TestAppConfigMerge(t *testing.T) {
	base := DefaultAppConfig()
	base.General.DefaultAgent = "existing-agent"

	partial := &AppConfig{
		General: GeneralConfig{
			OrchestratorInterval: 10,
		},
	}

	base.Merge(partial)

	if base.General.DefaultAgent != "existing-agent" {
		t.Errorf("Merge should preserve existing agent, got %q", base.General.DefaultAgent)
	}
	if base.General.OrchestratorInterval != 10 {
		t.Errorf("Merge should update interval to 10, got %d", base.General.OrchestratorInterval)
	}
	if base.General.LogRetentionDays != 30 {
		t.Errorf("Merge should preserve retention days 30, got %d", base.General.LogRetentionDays)
	}
}
