package executor

import (
	"sync"
	"testing"
	"time"

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
