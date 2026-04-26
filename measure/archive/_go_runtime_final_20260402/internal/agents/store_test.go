package agents

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStoreLayering(t *testing.T) {
	tmpDir := t.TempDir()
	userDir := filepath.Join(tmpDir, "user")
	projectDir := filepath.Join(tmpDir, "project")

	if err := os.MkdirAll(userDir, 0755); err != nil {
		t.Fatalf("failed to create user dir: %v", err)
	}
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatalf("failed to create project dir: %v", err)
	}

	userOverride := []byte(`---
description: Architect user override
mode: agent
model: claude-code/default
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
---

User body.
`)
	if err := os.WriteFile(filepath.Join(userDir, "architect.md"), userOverride, 0644); err != nil {
		t.Fatalf("failed to write user override: %v", err)
	}

	projectOverride := []byte(`---
description: Architect project override
mode: agent
model: claude-code/default
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
---

Project body.
`)
	if err := os.WriteFile(filepath.Join(projectDir, "architect.md"), projectOverride, 0644); err != nil {
		t.Fatalf("failed to write project override: %v", err)
	}

	store := NewStore(BundledFS, userDir, projectDir)
	list, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(list) < 8 {
		t.Fatalf("Expected at least 8 definitions, got %d", len(list))
	}

	var alpha *ResolvedDefinition
	for _, item := range list {
		if item.Definition.Name == "architect" {
			alpha = &item
		}
	}
	if alpha == nil {
		t.Fatalf("Expected architect definition")
	}
	if alpha.Layer != LayerProject {
		t.Errorf("Expected project layer, got %s", alpha.Layer)
	}
	if alpha.Definition.Description != "Architect project override" {
		t.Errorf("Expected project override description, got %q", alpha.Definition.Description)
	}
}

func TestStoreSaveUser(t *testing.T) {
	tmpDir := t.TempDir()
	userDir := filepath.Join(tmpDir, "user")

	store := NewStore(BundledFS, userDir, "")
	def := &Definition{
		Name:        "custom",
		Description: "Custom agent",
		Mode:        "agent",
		Model:       "claude-code/default",
		Temperature: 0.2,
		Tools: map[string]bool{
			"write": true,
			"edit":  true,
			"bash":  false,
		},
		Body: "Custom body.",
	}

	if err := store.SaveUser(def); err != nil {
		t.Fatalf("SaveUser failed: %v", err)
	}

	path := filepath.Join(userDir, "custom.md")
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("Expected file to exist: %v", err)
	}
}
