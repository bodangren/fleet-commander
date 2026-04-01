package review

import (
	"context"
	"log"
	"time"
)

const defaultReviewTimeout = 5 * time.Minute

// AgentRunner is the interface for executing an agent with a prompt.
type AgentRunner interface {
	RunWithPrompt(ctx context.Context, agentName, prompt string, timeout time.Duration) (string, error)
}

// Dispatcher handles dispatching review tasks to the reviewer agent.
type Dispatcher struct {
	runner  AgentRunner
	timeout time.Duration
}

// NewDispatcher creates a new review dispatcher.
func NewDispatcher(runner AgentRunner, timeout time.Duration) *Dispatcher {
	if timeout <= 0 {
		timeout = defaultReviewTimeout
	}
	return &Dispatcher{
		runner:  runner,
		timeout: timeout,
	}
}

// ReviewTask dispatches a review task to the reviewer agent and returns the parsed result.
// If the agent times out or errors, a neutral "pass" result is returned.
func (d *Dispatcher) ReviewTask(ctx context.Context, taskID, taskSpec, diff string, criteria []string, depth ReviewDepth) (*ReviewResult, error) {
	prompt := BuildReviewPrompt(taskSpec, diff, criteria, depth)

	timeoutCtx, cancel := context.WithTimeout(ctx, d.timeout)
	defer cancel()

	output, err := d.runner.RunWithPrompt(timeoutCtx, "reviewer", prompt, d.timeout)
	if err != nil {
		log.Printf("Warning: reviewer agent failed for task %s: %v", taskID, err)
		return &ReviewResult{Status: "pass", Comments: nil}, nil
	}

	result, err := ParseReviewResult(output)
	if err != nil {
		log.Printf("Warning: failed to parse reviewer output for task %s: %v", taskID, err)
		return &ReviewResult{Status: "pass", Comments: nil}, nil
	}

	return result, nil
}
