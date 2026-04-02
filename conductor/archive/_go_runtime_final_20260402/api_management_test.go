package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/conductor/fleet-commander/internal/harness"
)

func TestManagementAPIListsAgentsAndHarnesses(t *testing.T) {
	homeDir := t.TempDir()
	projectDir := t.TempDir()
	t.Setenv("HOME", homeDir)

	agentsDir := filepath.Join(homeDir, ".conductor", "agents")
	harnessDir := filepath.Join(homeDir, ".conductor", "harnesses")
	if err := os.MkdirAll(agentsDir, 0755); err != nil {
		t.Fatalf("failed to create agents dir: %v", err)
	}
	if err := os.MkdirAll(harnessDir, 0755); err != nil {
		t.Fatalf("failed to create harness dir: %v", err)
	}

	if err := os.WriteFile(filepath.Join(agentsDir, "architect.md"), []byte(`---
description: User architect override
mode: agent
model: user/model
temperature: 0.4
tools:
  write: true
  edit: true
  bash: false
---

User override body.
`), 0644); err != nil {
		t.Fatalf("failed to write agent override: %v", err)
	}

	if err := os.WriteFile(filepath.Join(harnessDir, "mock-harness.yaml"), []byte(`name: Mock Harness
binary: mock-harness
discovery:
  command: mock-harness
  parse_strategy: line-per-model
  pattern: ""
invocation:
  template: mock-harness --model {model} --print "{prompt}"
  flags: {}
`), 0644); err != nil {
		t.Fatalf("failed to write harness override: %v", err)
	}

	mockBinDir := t.TempDir()
	mockBinary := filepath.Join(mockBinDir, "mock-harness")
	if err := os.WriteFile(mockBinary, []byte("#!/bin/sh\necho alpha\necho beta\n"), 0755); err != nil {
		t.Fatalf("failed to write mock binary: %v", err)
	}
	t.Setenv("PATH", mockBinDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	api := newManagementAPI(projectDir)
	mux := http.NewServeMux()
	api.register(mux)

	agentReq := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	agentRec := httptest.NewRecorder()
	mux.ServeHTTP(agentRec, agentReq)
	if agentRec.Code != http.StatusOK {
		t.Fatalf("unexpected agent status: %d", agentRec.Code)
	}

	var agents []map[string]any
	if err := json.Unmarshal(agentRec.Body.Bytes(), &agents); err != nil {
		t.Fatalf("failed to decode agents response: %v", err)
	}
	if len(agents) < 8 {
		t.Fatalf("expected bundled agents in response, got %d", len(agents))
	}

	harnessReq := httptest.NewRequest(http.MethodGet, "/api/harnesses", nil)
	harnessRec := httptest.NewRecorder()
	mux.ServeHTTP(harnessRec, harnessReq)
	if harnessRec.Code != http.StatusOK {
		t.Fatalf("unexpected harness status: %d", harnessRec.Code)
	}

	var harnesses []map[string]any
	if err := json.Unmarshal(harnessRec.Body.Bytes(), &harnesses); err != nil {
		t.Fatalf("failed to decode harnesses response: %v", err)
	}
	if len(harnesses) != 2 {
		t.Fatalf("expected bundled opencode plus mock override, got %d", len(harnesses))
	}
}

func TestManagementAPIDiscoveryEndpoint(t *testing.T) {
	homeDir := t.TempDir()
	projectDir := t.TempDir()
	t.Setenv("HOME", homeDir)

	harnessDir := filepath.Join(homeDir, ".conductor", "harnesses")
	if err := os.MkdirAll(harnessDir, 0755); err != nil {
		t.Fatalf("failed to create harness dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(harnessDir, "mock-harness.yaml"), []byte(`name: Mock Harness
binary: mock-harness
discovery:
  command: mock-harness
  parse_strategy: line-per-model
  pattern: ""
invocation:
  template: mock-harness --model {model} --print "{prompt}"
  flags: {}
`), 0644); err != nil {
		t.Fatalf("failed to write harness override: %v", err)
	}

	mockBinDir := t.TempDir()
	mockBinary := filepath.Join(mockBinDir, "mock-harness")
	if err := os.WriteFile(mockBinary, []byte("#!/bin/sh\necho alpha\necho beta\n"), 0755); err != nil {
		t.Fatalf("failed to write mock binary: %v", err)
	}
	t.Setenv("PATH", mockBinDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	api := newManagementAPI(projectDir)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/harnesses/{name}/models", api.handleDiscoverHarnessModels)

	req := httptest.NewRequest(http.MethodGet, "/api/harnesses/mock-harness/models", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected discovery status: %d body=%s", rec.Code, rec.Body.String())
	}

	if !strings.Contains(rec.Body.String(), "alpha") || !strings.Contains(rec.Body.String(), "beta") {
		t.Fatalf("unexpected discovery response: %s", rec.Body.String())
	}
}

func TestBuildHarnessTestCommandUsesBinaryAndPreservesQuotedPrompt(t *testing.T) {
	command, args, err := buildHarnessTestCommand(harness.Definition{
		Name:   "Mock Harness",
		Binary: "mock-harness",
		Invocation: harness.InvocationConfig{
			Template: "mock-harness --model {model} --print \"{prompt}\"",
		},
	}, "mock-model", "Respond with OK")
	if err != nil {
		t.Fatalf("buildHarnessTestCommand failed: %v", err)
	}

	if command != "mock-harness" {
		t.Fatalf("expected binary command, got %q", command)
	}
	if len(args) != 4 {
		t.Fatalf("expected 4 args, got %d: %#v", len(args), args)
	}
	if args[0] != "--model" || args[1] != "mock-model" || args[2] != "--print" || args[3] != "Respond with OK" {
		t.Fatalf("unexpected args: %#v", args)
	}
}

func TestBuildHarnessTestCommandSupportsBundledHarnessSyntax(t *testing.T) {
	cases := []struct {
		name     string
		def      harness.Definition
		modelID  string
		prompt   string
		wantArgs []string
	}{
		{
			name:    "Opencode",
			modelID: "anthropic/claude-sonnet-4-6",
			prompt:  "Respond with OK",
			def: harness.Definition{
				Name:   "Opencode",
				Binary: "opencode",
				Invocation: harness.InvocationConfig{
					Template: "opencode -m {model} run \"{prompt}\"",
				},
			},
			wantArgs: []string{"-m", "anthropic/claude-sonnet-4-6", "run", "Respond with OK"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			command, args, err := buildHarnessTestCommand(tc.def, tc.modelID, tc.prompt)
			if err != nil {
				t.Fatalf("buildHarnessTestCommand failed: %v", err)
			}
			if command != tc.def.Binary {
				t.Fatalf("expected command %q, got %q", tc.def.Binary, command)
			}
			if len(args) != len(tc.wantArgs) {
				t.Fatalf("expected %d args, got %d: %#v", len(tc.wantArgs), len(args), args)
			}
			for i := range tc.wantArgs {
				if args[i] != tc.wantArgs[i] {
					t.Fatalf("unexpected arg %d: want %q got %q (args=%#v)", i, tc.wantArgs[i], args[i], args)
				}
			}
		})
	}
}

func TestManagementAPIAgentDryRun(t *testing.T) {
	homeDir := t.TempDir()
	projectDir := t.TempDir()
	t.Setenv("HOME", homeDir)

	agentsDir := filepath.Join(homeDir, ".conductor", "agents")
	harnessDir := filepath.Join(homeDir, ".conductor", "harnesses")
	if err := os.MkdirAll(agentsDir, 0755); err != nil {
		t.Fatalf("failed to create agents dir: %v", err)
	}
	if err := os.MkdirAll(harnessDir, 0755); err != nil {
		t.Fatalf("failed to create harness dir: %v", err)
	}

	if err := os.WriteFile(filepath.Join(harnessDir, "Mock Harness.yaml"), []byte(`name: Mock Harness
binary: mock-harness
discovery:
  command: mock-harness
  parse_strategy: line-per-model
  pattern: ""
invocation:
  template: mock-harness --model {model} --print "{prompt}"
  flags: {}
`), 0644); err != nil {
		t.Fatalf("failed to write harness override: %v", err)
	}

	if err := os.WriteFile(filepath.Join(agentsDir, "test-agent.md"), []byte(`---
description: Dry run agent
mode: agent
model: Mock Harness/mock-model
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
---

Prompt body.
`), 0644); err != nil {
		t.Fatalf("failed to write agent override: %v", err)
	}

	mockBinDir := t.TempDir()
	mockBinary := filepath.Join(mockBinDir, "mock-harness")
	if err := os.WriteFile(mockBinary, []byte("#!/bin/sh\necho \"$*\"\n"), 0755); err != nil {
		t.Fatalf("failed to write mock binary: %v", err)
	}
	t.Setenv("PATH", mockBinDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	api := newManagementAPI(projectDir)
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/agents/{name}/test", api.handleTestAgent)

	req := httptest.NewRequest(http.MethodPost, "/api/agents/test-agent/test", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected dry run status: %d body=%s", rec.Code, rec.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode dry run response: %v", err)
	}
	if payload["status"] != "success" {
		t.Fatalf("unexpected dry run status: %v", payload["status"])
	}
	if !strings.Contains(payload["output"].(string), "Respond with OK") {
		t.Fatalf("unexpected dry run output: %v", payload["output"])
	}
}
