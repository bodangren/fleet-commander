package agents

import "testing"

func TestMarshalParseDefinitionRoundtrip(t *testing.T) {
	def := &Definition{
		Name:        "alpha",
		Description: "Alpha agent",
		Mode:        "agent",
		Model:       "claude-code/default",
		Temperature: 0.2,
		Tools: map[string]bool{
			"write": true,
			"edit":  true,
			"bash":  false,
		},
		Body: "Hello",
	}

	data, err := MarshalDefinition(def)
	if err != nil {
		t.Fatalf("MarshalDefinition failed: %v", err)
	}

	parsed, err := ParseDefinition(data)
	if err != nil {
		t.Fatalf("ParseDefinition failed: %v", err)
	}

	if parsed.Description != def.Description {
		t.Errorf("Expected description %q, got %q", def.Description, parsed.Description)
	}
	if parsed.Mode != def.Mode {
		t.Errorf("Expected mode %q, got %q", def.Mode, parsed.Mode)
	}
	if parsed.Model != def.Model {
		t.Errorf("Expected model %q, got %q", def.Model, parsed.Model)
	}
	if parsed.Temperature != def.Temperature {
		t.Errorf("Expected temperature %v, got %v", def.Temperature, parsed.Temperature)
	}
	if parsed.Body != def.Body {
		t.Errorf("Expected body %q, got %q", def.Body, parsed.Body)
	}
}

func TestParseDefinitionRejectsMissingClosingFrontmatter(t *testing.T) {
	_, err := ParseDefinition([]byte(`---
description: Missing close
mode: agent
model: claude-code/default
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false

Body without closing delimiter.
`))
	if err == nil {
		t.Fatal("expected ParseDefinition to fail when frontmatter is unterminated")
	}
}

func TestParseDefinitionRejectsInvalidModelFormat(t *testing.T) {
	_, err := ParseDefinition([]byte(`---
description: Invalid model format
mode: agent
model: invalid-model-format
temperature: 0.2
tools:
  write: true
---

Body text.
`))
	if err == nil {
		t.Fatal("expected ParseDefinition to fail when model format is invalid (missing '/')")
	}
	if err.Error() != `agent model "invalid-model-format" must use harness/model format` {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestParseDefinitionAcceptsValidModelFormat(t *testing.T) {
	def, err := ParseDefinition([]byte(`---
description: Valid model format
mode: agent
model: opencode/gemini-2.0-flash
temperature: 0.2
tools:
  write: true
---

Body text.
`))
	if err != nil {
		t.Fatalf("expected ParseDefinition to succeed with valid model format: %v", err)
	}
	if def.Model != "opencode/gemini-2.0-flash" {
		t.Errorf("unexpected model value: %q", def.Model)
	}
}

func TestParseDefinitionAcceptsEmptyModel(t *testing.T) {
	def, err := ParseDefinition([]byte(`---
description: No model specified
mode: agent
temperature: 0.2
tools:
  write: true
---

Body text.
`))
	if err != nil {
		t.Fatalf("expected ParseDefinition to succeed without model: %v", err)
	}
	if def.Model != "" {
		t.Errorf("expected empty model, got: %q", def.Model)
	}
}
