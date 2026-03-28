package harness

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseAndMarshalDefinitionRoundTrip(t *testing.T) {
	def := &Definition{
		Name:   "OpenCode",
		Binary: "opencode",
		Discovery: DiscoveryConfig{
			Command:       "opencode models",
			ParseStrategy: "line-per-model",
			Pattern:       "",
		},
		Invocation: InvocationConfig{
			Template: "opencode -m {model} run \"{prompt}\"",
			Flags: map[string]string{
				"no_interactive": "--no-interactive",
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
		Name:   "Custom Harness",
		Binary: "custom-user",
		Discovery: DiscoveryConfig{
			Command:       "custom-user --help",
			ParseStrategy: "regex",
			Pattern:       ".*",
		},
		Invocation: InvocationConfig{Template: "custom-user --model {model} --print \"{prompt}\""},
	}
	if err := store.SaveUser(userOverride); err != nil {
		t.Fatalf("SaveUser failed: %v", err)
	}

	projectOverride := &Definition{
		Name:   "Custom Harness",
		Binary: "custom-project",
		Discovery: DiscoveryConfig{
			Command:       "custom-project --help",
			ParseStrategy: "regex",
			Pattern:       ".*",
		},
		Invocation: InvocationConfig{Template: "custom-project --model {model} --print \"{prompt}\""},
	}
	if err := store.SaveProject(projectOverride); err != nil {
		t.Fatalf("SaveProject failed: %v", err)
	}

	resolved, found, err := store.Get("Custom Harness")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if !found {
		t.Fatal("expected Custom Harness to resolve")
	}
	if resolved.Layer != LayerProject {
		t.Fatalf("expected project layer, got %s", resolved.Layer)
	}
	if resolved.Definition.Binary != "custom-project" {
		t.Fatalf("expected project override, got %+v", resolved.Definition)
	}

	all, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(all) != 2 {
		t.Fatalf("expected 2 resolved harnesses, got %d", len(all))
	}

	if err := store.Reset("Custom Harness"); err != nil {
		t.Fatalf("Reset failed: %v", err)
	}

	userPath := filepath.Join(userDir, "custom-harness.yaml")
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

func TestBundledHarnessSyntaxMatchesCurrentCliFlags(t *testing.T) {
	store := NewStore(BundledFS, "", "")
	list, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	byName := make(map[string]ResolvedDefinition, len(list))
	for _, item := range list {
		byName[item.Definition.Name] = item
	}

	cases := []struct {
		name     string
		binary   string
		command  string
		template string
	}{
		{
			name:     "Opencode",
			binary:   "opencode",
			command:  "opencode models",
			template: "opencode -m {model} run \"{prompt}\"",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			item, ok := byName[tc.name]
			if !ok {
				t.Fatalf("expected bundled harness %q to exist", tc.name)
			}
			if item.Definition.Binary != tc.binary {
				t.Fatalf("expected binary %q, got %q", tc.binary, item.Definition.Binary)
			}
			if item.Definition.Discovery.Command != tc.command {
				t.Fatalf("expected discovery command %q, got %q", tc.command, item.Definition.Discovery.Command)
			}
			if item.Definition.Discovery.ParseStrategy != "line-per-model" {
				t.Fatalf("expected line-per-model discovery, got %q", item.Definition.Discovery.ParseStrategy)
			}
			if item.Definition.Invocation.Template != tc.template {
				t.Fatalf("expected invocation template %q, got %q", tc.template, item.Definition.Invocation.Template)
			}
			if tc.name == "Opencode" && item.Definition.Invocation.Flags["no_interactive"] != "--no-interactive" {
				t.Fatalf("expected no_interactive flag, got %+v", item.Definition.Invocation.Flags)
			}
		})
	}
}
