package review

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ReviewDepth controls how thorough the reviewer agent should be.
type ReviewDepth string

const (
	DepthQuick    ReviewDepth = "quick"
	DepthThorough ReviewDepth = "thorough"
)

func (d ReviewDepth) String() string {
	return string(d)
}

// ParseDepth converts a string to ReviewDepth, defaulting to quick.
func ParseDepth(s string) ReviewDepth {
	switch ReviewDepth(s) {
	case DepthQuick, DepthThorough:
		return ReviewDepth(s)
	default:
		return DepthQuick
	}
}

// ReviewComment is a single inline comment from the reviewer agent.
type ReviewComment struct {
	File     string `json:"file"`
	Line     int    `json:"line"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

// ReviewResult is the structured output from the reviewer agent.
type ReviewResult struct {
	Status   string          `json:"status"`
	Comments []ReviewComment `json:"comments"`
}

// ParseReviewResult parses the reviewer agent's output into a ReviewResult.
func ParseReviewResult(output string) (*ReviewResult, error) {
	trimmed := strings.TrimSpace(output)
	if trimmed == "" {
		return nil, fmt.Errorf("empty reviewer output")
	}

	// Try to extract JSON from fenced code block if present
	if idx := strings.Index(trimmed, "```"); idx >= 0 {
		// Find the opening and closing code fences
		parts := strings.Split(trimmed, "```")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if strings.HasPrefix(part, "json") {
				part = strings.TrimPrefix(part, "json")
				part = strings.TrimSpace(part)
			}
			if strings.HasPrefix(part, "{") {
				trimmed = part
				break
			}
		}
	}

	var result ReviewResult
	if err := json.Unmarshal([]byte(trimmed), &result); err != nil {
		return nil, fmt.Errorf("parse reviewer output: %w", err)
	}

	if result.Status != "pass" && result.Status != "needs-changes" {
		return nil, fmt.Errorf("unknown review status %q", result.Status)
	}

	return &result, nil
}

var defaultCriteria = []string{"Correctness", "Code style", "Test coverage", "Security"}

// BuildReviewPrompt creates a prompt for the reviewer agent from a task spec,
// file diff, review criteria, and depth setting.
func BuildReviewPrompt(taskSpec, diff string, criteria []string, depth ReviewDepth) string {
	if len(criteria) == 0 {
		criteria = defaultCriteria
	}

	criteriaList := "- " + strings.Join(criteria, "\n- ")

	diffSection := diff
	if diffSection == "" {
		diffSection = "No file diff available. Review based on task description only."
	}

	depthInstruction := "Perform a quick, focused review of the changes."
	if depth == DepthThorough {
		depthInstruction = "Perform a thorough, multi-aspect review. Examine each changed file carefully and consider edge cases, performance implications, and long-term maintainability."
	}

	return fmt.Sprintf(`## Task Description

%s

## File Diff

%s

## Review Criteria

%s

## Instructions

%s

Respond with a JSON object in the following format (no markdown, no explanation, just the JSON):

{
  "status": "pass" or "needs-changes",
  "comments": [
    {
      "file": "path/to/file.ext",
      "line": 12,
      "severity": "low" | "medium" | "high" | "critical",
      "message": "Description of the issue"
    }
  ]
}

If the code passes all criteria, return "status": "pass" with an empty comments array.
If changes are needed, return "status": "needs-changes" with one comment per issue.`,
		taskSpec, diffSection, criteriaList, depthInstruction)
}
