package review

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"
)

type mockAgentRunner struct {
	output string
	err    error
	delay  time.Duration
}

func (m *mockAgentRunner) RunWithPrompt(ctx context.Context, agentName, prompt string, timeout time.Duration) (string, error) {
	if m.delay > 0 {
		select {
		case <-time.After(m.delay):
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
	return m.output, m.err
}

func TestDispatcher_PassResult(t *testing.T) {
	runner := &mockAgentRunner{
		output: `{"status":"pass","comments":[]}`,
	}
	d := NewDispatcher(runner, 5*time.Second)

	result, err := d.ReviewTask(context.Background(), "task-1", "Add validation", "diff content", nil, DepthQuick)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Status != "pass" {
		t.Errorf("status = %q, want %q", result.Status, "pass")
	}
	if len(result.Comments) != 0 {
		t.Errorf("expected 0 comments, got %d", len(result.Comments))
	}
}

func TestDispatcher_NeedsChangesResult(t *testing.T) {
	runner := &mockAgentRunner{
		output: `{"status":"needs-changes","comments":[{"file":"main.go","line":10,"severity":"high","message":"missing validation"}]}`,
	}
	d := NewDispatcher(runner, 5*time.Second)

	result, err := d.ReviewTask(context.Background(), "task-1", "Add validation", "diff content", nil, DepthQuick)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Status != "needs-changes" {
		t.Errorf("status = %q, want %q", result.Status, "needs-changes")
	}
	if len(result.Comments) != 1 {
		t.Fatalf("expected 1 comment, got %d", len(result.Comments))
	}
	if result.Comments[0].Message != "missing validation" {
		t.Errorf("comment message = %q, want %q", result.Comments[0].Message, "missing validation")
	}
}

func TestDispatcher_TimeoutReturnsNeutralResult(t *testing.T) {
	runner := &mockAgentRunner{
		delay: 10 * time.Second,
	}
	d := NewDispatcher(runner, 100*time.Millisecond)

	result, err := d.ReviewTask(context.Background(), "task-1", "Add validation", "diff content", nil, DepthQuick)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Status != "pass" {
		t.Errorf("timeout should return neutral pass status, got %q", result.Status)
	}
}

func TestDispatcher_ErrorReturnsNeutralResult(t *testing.T) {
	runner := &mockAgentRunner{
		err: fmt.Errorf("agent crashed"),
	}
	d := NewDispatcher(runner, 5*time.Second)

	result, err := d.ReviewTask(context.Background(), "task-1", "Add validation", "diff content", nil, DepthQuick)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Status != "pass" {
		t.Errorf("agent error should return neutral pass status, got %q", result.Status)
	}
}

func TestDispatcher_PassesDepthToPrompt(t *testing.T) {
	capturedPrompt := ""
	runner := &capturingRunner{capture: &capturedPrompt}
	d := NewDispatcher(runner, 5*time.Second)

	_, _ = d.ReviewTask(context.Background(), "task-1", "Some task", "some diff", nil, DepthThorough)

	if !strings.Contains(capturedPrompt, "thorough, multi-aspect review") {
		t.Errorf("thorough depth should produce thorough prompt, got:\n%s", capturedPrompt)
	}
}

type capturingRunner struct {
	capture *string
}

func (c *capturingRunner) RunWithPrompt(ctx context.Context, agentName, prompt string, timeout time.Duration) (string, error) {
	*c.capture = prompt
	return `{"status":"pass","comments":[]}`, nil
}

func TestDispatcher_DefaultTimeout(t *testing.T) {
	d := NewDispatcher(nil, 0)
	if d.timeout != defaultReviewTimeout {
		t.Errorf("default timeout = %v, want %v", d.timeout, defaultReviewTimeout)
	}
}
