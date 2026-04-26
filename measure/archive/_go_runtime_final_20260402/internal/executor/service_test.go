package executor

import (
	"sync"
	"testing"

	"github.com/measure/fleet-commander/internal/agents"
	"github.com/measure/fleet-commander/internal/harness"
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

func TestResolveAgentCommandAgentNotFound(t *testing.T) {
	resolver := NewAgentHarnessResolver(nil, nil)

	cmd, _, err := resolver.Resolve("unknown-agent", "Do something")
	if err != nil {
		t.Fatalf("Resolve returned error: %v", err)
	}
	if cmd != "echo" {
		t.Errorf("expected fallback command 'echo' for unknown agent, got %q", cmd)
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

func TestExecuteTaskMissingAgent(t *testing.T) {
	broadcaster := &recordingBroadcaster{
		notify: make(chan struct{}, 1),
	}

	agentStore := agents.NewStore(nil, "", "")
	harnessStore := harness.NewStore(nil, "", "")
	service := NewExecutionService(broadcaster, agentStore, harnessStore)

	// ExecuteTask with no agent tag should fail
	_, err := service.ExecuteTask("project-1", "task-1", "Build the button", "", "", "")
	if err == nil {
		t.Fatal("expected error for missing agent tag, got nil")
	}
	if err.Error() != "failed to resolve agent command: no agent tag specified for task" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestExecuteTaskUnknownAgent(t *testing.T) {
	broadcaster := &recordingBroadcaster{
		notify: make(chan struct{}, 1),
	}

	agentStore := agents.NewStore(nil, "", "")
	harnessStore := harness.NewStore(nil, "", "")
	service := NewExecutionService(broadcaster, agentStore, harnessStore)

	// ExecuteTask with unknown agent should fail
	_, err := service.ExecuteTask("project-1", "task-1", "Build the button", "", "", "unknown-agent")
	if err == nil {
		t.Fatal("expected error for unknown agent, got nil")
	}
	if err.Error() != `failed to resolve agent command: agent "unknown-agent" could not be resolved to a valid harness` {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestStopExecution(t *testing.T) {
	broadcaster := &recordingBroadcaster{
		notify: make(chan struct{}, 1),
	}

	agentStore := agents.NewStore(nil, "", "")
	harnessStore := harness.NewStore(nil, "", "")
	service := NewExecutionService(broadcaster, agentStore, harnessStore)

	// Register a mock agent and harness that uses 'sh' so we can test without dependencies
	resolver := NewAgentHarnessResolver(nil, nil)
	resolver.RegisterAgent(&agents.ResolvedDefinition{
		Definition: &agents.Definition{
			Name:  "test",
			Model: "test/model",
		},
	})
	resolver.RegisterHarness(&harness.ResolvedDefinition{
		Definition: &harness.Definition{
			Name:   "test",
			Binary: "sh",
			Invocation: harness.InvocationConfig{
				Template: "sh -c 'echo test'",
			},
		},
	})
	service.resolver = resolver

	// Start a task
	_, err := service.ExecuteTask("project-1", "task-1", "Test task", "", "", "test")
	if err != nil {
		t.Fatalf("ExecuteTask failed: %v", err)
	}

	// Verify it's running
	if _, exists := service.GetActiveRunner("project-1"); !exists {
		t.Fatal("expected active runner to exist")
	}

	// Stop it
	if err := service.StopExecution("project-1"); err != nil {
		t.Fatalf("StopExecution failed: %v", err)
	}

	// Verify it's stopped
	if _, exists := service.GetActiveRunner("project-1"); exists {
		t.Fatal("expected active runner to be removed")
	}
}

func TestStopExecutionNoActiveRunner(t *testing.T) {
	broadcaster := &recordingBroadcaster{
		notify: make(chan struct{}, 1),
	}

	agentStore := agents.NewStore(nil, "", "")
	harnessStore := harness.NewStore(nil, "", "")
	service := NewExecutionService(broadcaster, agentStore, harnessStore)

	// StopExecution with no active runner should fail
	err := service.StopExecution("project-1")
	if err == nil {
		t.Fatal("expected error for no active execution, got nil")
	}
	if err.Error() != "no active execution for project project-1" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestHasAgent(t *testing.T) {
	resolver := NewAgentHarnessResolver(nil, nil)

	if resolver.HasAgent("nonexistent") {
		t.Error("expected HasAgent to return false for nonexistent agent")
	}

	resolver.RegisterAgent(&agents.ResolvedDefinition{
		Definition: &agents.Definition{
			Name:  "test-agent",
			Model: "test/model",
		},
	})

	if !resolver.HasAgent("test-agent") {
		t.Error("expected HasAgent to return true for registered agent")
	}

	// Should be case-insensitive
	if !resolver.HasAgent("Test-Agent") {
		t.Error("expected HasAgent to be case-insensitive")
	}
}

func TestResolveCommandHarnessNotFound(t *testing.T) {
	resolver := NewAgentHarnessResolver(nil, nil)
	resolver.RegisterAgent(&agents.ResolvedDefinition{
		Definition: &agents.Definition{
			Name:  "test-agent",
			Model: "nonexistent/model",
		},
	})

	broadcaster := &recordingBroadcaster{}
	service := NewExecutionService(broadcaster, nil, nil)
	service.resolver = resolver

	_, _, err := service.resolveCommand("test-agent", "test task")
	if err == nil {
		t.Fatal("expected error for missing harness, got nil")
	}
	if !contains(err.Error(), "could not be resolved to a valid harness") {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestResolveCommandHarnessBinaryNotFound(t *testing.T) {
	resolver := NewAgentHarnessResolver(nil, nil)
	resolver.RegisterAgent(&agents.ResolvedDefinition{
		Definition: &agents.Definition{
			Name:  "test-agent",
			Model: "test/model",
		},
	})
	resolver.RegisterHarness(&harness.ResolvedDefinition{
		Definition: &harness.Definition{
			Name:   "test",
			Binary: "nonexistent-binary-12345",
			Invocation: harness.InvocationConfig{
				Template: "nonexistent-binary-12345 test",
			},
		},
	})

	broadcaster := &recordingBroadcaster{}
	service := NewExecutionService(broadcaster, nil, nil)
	service.resolver = resolver

	_, _, err := service.resolveCommand("test-agent", "test task")
	if err == nil {
		t.Fatal("expected error for missing harness binary, got nil")
	}
	if !contains(err.Error(), "not found on PATH") {
		t.Errorf("unexpected error message: %v", err)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
