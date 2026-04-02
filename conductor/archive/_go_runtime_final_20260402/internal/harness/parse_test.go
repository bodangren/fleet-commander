package harness

import "testing"

func TestMarshalParseDefinitionRoundtrip(t *testing.T) {
	def := &Definition{
		Name:   "Example",
		Binary: "example",
		Discovery: DiscoveryConfig{
			Command:       "example --list",
			ParseStrategy: "line-per-model",
			Pattern:       "",
		},
		Invocation: InvocationConfig{
			Template: "example --model {model} --print {prompt}",
			Flags: map[string]string{
				"dry_run": "--dry-run",
			},
		},
	}

	data, err := MarshalDefinition(def)
	if err != nil {
		t.Fatalf("MarshalDefinition failed: %v", err)
	}

	parsed, err := ParseDefinition(data)
	if err != nil {
		t.Fatalf("ParseDefinition failed: %v", err)
	}

	if parsed.Name != def.Name {
		t.Errorf("Expected name %q, got %q", def.Name, parsed.Name)
	}
	if parsed.Binary != def.Binary {
		t.Errorf("Expected binary %q, got %q", def.Binary, parsed.Binary)
	}
	if parsed.Discovery.Command != def.Discovery.Command {
		t.Errorf("Expected command %q, got %q", def.Discovery.Command, parsed.Discovery.Command)
	}
	if parsed.Invocation.Template != def.Invocation.Template {
		t.Errorf("Expected template %q, got %q", def.Invocation.Template, parsed.Invocation.Template)
	}
}
