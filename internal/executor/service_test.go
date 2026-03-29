package executor

import (
	"sync"
	"testing"
	"time"

	"github.com/conductor/fleet-commander/internal/agents"
	"github.com/conductor/fleet-commander/internal/harness"
	"github.com/conductor/fleet-commander/internal/models"
)

type recordingBroadcaster struct {
	mu       sync.Mutex
	messages []any
	notify   chan struct{}
}

func (r *recordingBroadcaster) Broadcast(_ string, message any) {
	r.mu.Lock()
	r.messages = append(r.messages, message)
	r.mu.Unlock()

	select {
	case r.notify <- struct{}{}:
	default:
	}
}

func TestResolveAgentCommand(t *testing.T) {
	resolver := NewAgentHarnessResolver(
		agents.NewStore(nil, "", ""),
		harness.NewStore(nil, "", ""),
	)

	resolver.RegisterAgent(&agents.ResolvedDefinition{
		Definition: &agents.Definition{
			Name:  "senior-frontend",
			Model: "opencode/gemini-2.0-flash",
		},
		Layer: agents.LayerBundled,
	})
	resolver.RegisterHarness(&harness.ResolvedDefinition{
		Definition: &harness.Definition{
			Name:   "opencode",
			Binary: "opencode",
			Invocation: harness.InvocationConfig{
				Template: "opencode --model {model} --prompt \"{prompt}\"",
			},
		},
		Layer: harness.LayerBundled,
	})

	cmd, args, err := resolver.Resolve("senior-frontend", "Build the login button")
	if err != nil {
		t.Fatalf("Resolve returned error: %v", err)
	}
	if cmd != "opencode" {
		t.Errorf("expected command 'opencode', got %q", cmd)
	}
	found := false
	for _, a := range args {
		if a == "--model" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected --model flag in args, got %v", args)
	}
}

func TestResolveAgentCommandFallback(t *testing.T) {
	resolver := NewAgentHarnessResolver(nil, nil)

	cmd, _, err := resolver.Resolve("unknown-agent", "Do something")
	if err != nil {
		t.Fatalf("Resolve returned error: %v", err)
	}
	if cmd != "echo" {
		t.Errorf("expected fallback command 'echo', got %q", cmd)
	}
}

func TestResolveAgentCommandModelFormat(t *testing.T) {
	resolver := NewAgentHarnessResolver(nil, nil)

	resolver.RegisterAgent(&agents.ResolvedDefinition{
		Definition: &agents.Definition{
			Name:  "reviewer",
			Model: "opencode/claude-sonnet-4",
		},
		Layer: agents.LayerBundled,
	})
	resolver.RegisterHarness(&harness.ResolvedDefinition{
		Definition: &harness.Definition{
			Name:   "opencode",
			Binary: "opencode",
			Invocation: harness.InvocationConfig{
				Template: "opencode --model {model} --prompt \"{prompt}\"",
			},
		},
		Layer: harness.LayerBundled,
	})

	_, args, err := resolver.Resolve("reviewer", "Review the PR")
	if err != nil {
		t.Fatalf("Resolve returned error: %v", err)
	}

	modelFound := false
	for i, a := range args {
		if a == "--model" && i+1 < len(args) {
			if args[i+1] == "claude-sonnet-4" {
				modelFound = true
			}
		}
	}
	if !modelFound {
		t.Errorf("expected --model claude-sonnet-4 in args, got %v", args)
	}
}

func TestExecuteTaskBroadcastsRunnerOutput(t *testing.T) {
	broadcaster := &recordingBroadcaster{
		notify: make(chan struct{}, 1),
	}
	service := NewExecutionService(broadcaster)
	service.RegisterAgentConfig(&models.AgentConfig{
		ID:      "test",
		Name:    "Test",
		Tag:     "test",
		Command: "sh",
		Args:    []string{"-c", "printf 'hello from runner\\n'"},
	})

	if err := service.ExecuteTask("project-1", "task-1", "Build the button", "", "", "test"); err != nil {
		t.Fatalf("ExecuteTask returned error: %v", err)
	}

	select {
	case <-broadcaster.notify:
	case <-time.After(2 * time.Second):
		t.Fatal("expected runner output to be broadcast")
	}

	broadcaster.mu.Lock()
	defer broadcaster.mu.Unlock()
	if len(broadcaster.messages) == 0 {
		t.Fatal("expected at least one broadcast message")
	}
}
