package analysis

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// AnalysisResult is a single finding produced by a static-analysis tool.
type AnalysisResult struct {
	Tool     string
	File     string
	Line     int
	Column   int
	Severity string // canonical: error, warning, info
	Message  string
	Rule     string
}

// Runner executes configured analysis tools and collects results.
type Runner struct {
	Config  *AnalysisConfig
	Timeout time.Duration
	Dir     string // working directory for commands
}

// NewRunner creates a Runner with sensible defaults.
func NewRunner(cfg *AnalysisConfig, dir string) *Runner {
	return &Runner{
		Config:  cfg,
		Timeout: 5 * time.Minute,
		Dir:     dir,
	}
}

// Run executes every enabled tool and returns the aggregated results.
func (r *Runner) Run(ctx context.Context) ([]AnalysisResult, error) {
	var all []AnalysisResult

	for _, tool := range r.Config.Tools {
		if !tool.Enabled {
			continue
		}

		results, err := r.runTool(ctx, tool)
		if err != nil {
			return nil, fmt.Errorf("tool %s: %w", tool.Name, err)
		}
		all = append(all, results...)
	}

	return all, nil
}

func (r *Runner) runTool(ctx context.Context, tool ToolConfig) ([]AnalysisResult, error) {
	ctx, cancel := context.WithTimeout(ctx, r.Timeout)
	defer cancel()

	parts := strings.Fields(tool.Command)
	if len(parts) == 0 {
		return nil, fmt.Errorf("empty command for tool %s", tool.Name)
	}

	cmd := exec.CommandContext(ctx, parts[0], parts[1:]...)
	cmd.Dir = r.Dir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Many linters exit non-zero when issues are found; we still want their output.
	_ = cmd.Run()

	output := stdout.Bytes()
	if len(output) == 0 {
		output = stderr.Bytes()
	}

	var results []AnalysisResult
	var err error

	switch tool.OutputFormat {
	case "json":
		results, err = ParseJSON(output, tool.Name)
	case "text":
		results, err = ParseText(output, tool.Name)
	default:
		return nil, fmt.Errorf("unknown output_format %q for tool %s", tool.OutputFormat, tool.Name)
	}

	if err != nil {
		return nil, err
	}

	// Map severities to canonical values.
	for i := range results {
		if mapped, ok := tool.SeverityMap[results[i].Severity]; ok {
			results[i].Severity = mapped
		}
	}

	return results, nil
}
