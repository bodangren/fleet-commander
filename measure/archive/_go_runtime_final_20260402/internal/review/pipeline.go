package review

import (
	"bytes"
	"context"
	"os/exec"
	"strings"
	"time"
)

// CheckStatus represents the result status of a review check.
type CheckStatus string

const (
	StatusPassed  CheckStatus = "passed"
	StatusFailed  CheckStatus = "failed"
	StatusSkipped CheckStatus = "skipped"
	StatusTimeout CheckStatus = "timeout"
)

// CheckResult contains the result of a single review check.
type CheckResult struct {
	Category string      `json:"category"`
	Status   CheckStatus `json:"status"`
	Errors   []string    `json:"errors,omitempty"`
	Warnings []string    `json:"warnings,omitempty"`
	Output   string      `json:"output,omitempty"`
	Duration int64       `json:"durationMs"`
}

// Pipeline executes review commands and collects results.
type Pipeline struct {
	Config     *ReviewConfig
	ProjectDir string
}

// NewPipeline creates a new review pipeline for a project.
func NewPipeline(config *ReviewConfig, projectDir string) *Pipeline {
	return &Pipeline{Config: config, ProjectDir: projectDir}
}

// Run executes all enabled review commands sequentially.
func (p *Pipeline) Run(ctx context.Context) []CheckResult {
	var results []CheckResult

	checks := []struct {
		category string
		cmd      CommandConfig
	}{
		{"linter", p.Config.Linter},
		{"typecheck", p.Config.TypeCheck},
		{"test", p.Config.Test},
	}

	timeout := p.Config.GetTimeout()

	for _, check := range checks {
		if !check.cmd.Enabled || check.cmd.Command == "" {
			results = append(results, CheckResult{
				Category: check.category,
				Status:   StatusSkipped,
			})
			continue
		}

		result := p.runCommand(ctx, check.category, check.cmd.Command, timeout)
		results = append(results, result)
	}

	return results
}

// runCommand executes a single command with timeout.
func (p *Pipeline) runCommand(ctx context.Context, category, command string, timeout time.Duration) CheckResult {
	start := time.Now()

	cmdCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	parts := strings.Fields(command)
	if len(parts) == 0 {
		return CheckResult{
			Category: category,
			Status:   StatusFailed,
			Errors:   []string{"empty command"},
			Duration: time.Since(start).Milliseconds(),
		}
	}

	cmd := exec.CommandContext(cmdCtx, parts[0], parts[1:]...)
	cmd.Dir = p.ProjectDir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	duration := time.Since(start).Milliseconds()

	output := stdout.String()
	if stderr.Len() > 0 {
		output += "\n" + stderr.String()
	}
	output = strings.TrimSpace(output)

	if cmdCtx.Err() == context.DeadlineExceeded {
		return CheckResult{
			Category: category,
			Status:   StatusTimeout,
			Errors:   []string{"command timed out after " + timeout.String()},
			Output:   output,
			Duration: duration,
		}
	}

	if err != nil {
		var errors []string
		// Split stderr/stdout into lines for error list
		for _, line := range strings.Split(output, "\n") {
			line = strings.TrimSpace(line)
			if line != "" {
				errors = append(errors, line)
			}
		}
		if len(errors) == 0 {
			errors = []string{err.Error()}
		}
		return CheckResult{
			Category: category,
			Status:   StatusFailed,
			Errors:   errors,
			Output:   output,
			Duration: duration,
		}
	}

	return CheckResult{
		Category: category,
		Status:   StatusPassed,
		Output:   output,
		Duration: duration,
	}
}
