package harness

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseAndMarshalDefinitionRoundTrip(t *testing.T) {
	def := &Definition{
		Name:   "Claude Code",
		Binary: "claude",
		Discovery: DiscoveryConfig{
			Command:       "claude --help",
			ParseStrategy: "regex",
			Pattern:       "([A-Za-z0-9._-]+)",
		},
		Invocation: InvocationConfig{
			Template: "claude --model {model} --prompt {prompt}",
			Flags: map[string]string{
				"dangerously_skip_permissions": "--dangerously-skip-permissions",
			},
		},
	}

	marshaled, err := MarshalDefinition(def)
	if err != nil {
		t.Fatalf("MarshalDefinition failed: %v", err)
	}

	parsed, err := ParseDefinition(marshaled)
	if err != nil {
		t.Fatalf("ParseDefinition failed: %v", err)
	}

	if parsed.Name != def.Name || parsed.Binary != def.Binary {
		t.Fatalf("parsed definition mismatch: %+v", parsed)
	}
}

func TestStorePrecedenceResetAndAtomicSave(t *testing.T) {
	projectDir := t.TempDir()
	userDir := t.TempDir()
	store := NewStore(BundledFS, userDir, projectDir)

	userOverride := &Definition{
		Name:   "Claude Code",
		Binary: "claude-user",
		Discovery: DiscoveryConfig{
			Command:       "claude-user --help",
			ParseStrategy: "regex",
			Pattern:       ".*",
		},
		Invocation: InvocationConfig{Template: "claude-user --model {model} --prompt {prompt}"},
	}
	if err := store.SaveUser(userOverride); err != nil {
		t.Fatalf("SaveUser failed: %v", err)
	}

	projectOverride := &Definition{
		Name:   "Claude Code",
		Binary: "claude-project",
		Discovery: DiscoveryConfig{
			Command:       "claude-project --help",
			ParseStrategy: "regex",
			Pattern:       ".*",
		},
		Invocation: InvocationConfig{Template: "claude-project --model {model} --prompt {prompt}"},
	}
	if err := store.SaveProject(projectOverride); err != nil {
		t.Fatalf("SaveProject failed: %v", err)
	}

	resolved, found, err := store.Get("Claude Code")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if !found {
		t.Fatal("expected Claude Code to resolve")
	}
	if resolved.Layer != LayerProject {
		t.Fatalf("expected project layer, got %s", resolved.Layer)
	}
	if resolved.Definition.Binary != "claude-project" {
		t.Fatalf("expected project override, got %+v", resolved.Definition)
	}

	all, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(all) != 4 {
		t.Fatalf("expected 4 bundled harnesses, got %d", len(all))
	}

	if err := store.Reset("Claude Code"); err != nil {
		t.Fatalf("Reset failed: %v", err)
	}

	userPath := filepath.Join(userDir, "claude-code.yaml")
	if _, err := os.Stat(userPath); !os.IsNotExist(err) {
		t.Fatalf("expected user override to be removed, got %v", err)
	}
}

func TestResetRemovesYAMLAndYMLOverrides(t *testing.T) {
	projectDir := t.TempDir()
	userDir := t.TempDir()
	store := NewStore(BundledFS, userDir, projectDir)

	yamlPath := filepath.Join(userDir, "alpha.yaml")
	ymlPath := filepath.Join(projectDir, "beta.yml")
	if err := os.WriteFile(yamlPath, []byte("name: alpha\nbinary: alpha\n"), 0644); err != nil {
		t.Fatalf("failed to write yaml override: %v", err)
	}
	if err := os.WriteFile(ymlPath, []byte("name: beta\nbinary: beta\n"), 0644); err != nil {
		t.Fatalf("failed to write yml override: %v", err)
	}

	if err := store.Reset("alpha"); err != nil {
		t.Fatalf("Reset(alpha) failed: %v", err)
	}
	if _, err := os.Stat(yamlPath); !os.IsNotExist(err) {
		t.Fatalf("expected YAML override to be removed, got %v", err)
	}

	if err := store.Reset("beta"); err != nil {
		t.Fatalf("Reset(beta) failed: %v", err)
	}
	if _, err := os.Stat(ymlPath); !os.IsNotExist(err) {
		t.Fatalf("expected YML override to be removed, got %v", err)
	}
}
