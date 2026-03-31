package orchestrator

import (
	"encoding/json"
	"log"
	"regexp"
	"strings"
)

var issueBlockRegex = regexp.MustCompile("(?s)```issue\\s*\n(.*?)```")

// ParsedIssue represents an issue extracted from agent output.
type ParsedIssue struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Severity    string   `json:"severity"`
	Labels      []string `json:"labels"`
}

// ParseIssues extracts all ```issue blocks from agent output.
// Returns an empty slice (not error) when no issue blocks are found.
// Malformed blocks are logged as warnings and skipped.
func ParseIssues(output string) []ParsedIssue {
	matches := issueBlockRegex.FindAllStringSubmatch(output, -1)
	if len(matches) == 0 {
		return nil
	}

	var issues []ParsedIssue
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		raw := strings.TrimSpace(match[1])
		if raw == "" {
			log.Printf("Warning: empty issue block, skipping")
			continue
		}

		var pi ParsedIssue
		if err := json.Unmarshal([]byte(raw), &pi); err != nil {
			log.Printf("Warning: malformed issue JSON, skipping: %v", err)
			continue
		}

		if pi.Title == "" || pi.Description == "" {
			log.Printf("Warning: issue block missing required fields (title/description), skipping")
			continue
		}

		issues = append(issues, pi)
	}

	return issues
}
