package orchestrator

import (
	"testing"
)

func TestParseIssuesSingleBlock(t *testing.T) {
	output := "Task completed.\n```issue\n{\"title\":\"Bug found\",\"description\":\"Something is wrong\",\"severity\":\"high\",\"labels\":[\"bug\"]}\n```\n"
	issues := ParseIssues(output)

	if len(issues) != 1 {
		t.Fatalf("Expected 1 issue, got %d", len(issues))
	}
	if issues[0].Title != "Bug found" {
		t.Errorf("Title = %q, want %q", issues[0].Title, "Bug found")
	}
	if issues[0].Description != "Something is wrong" {
		t.Errorf("Description = %q, want %q", issues[0].Description, "Something is wrong")
	}
	if issues[0].Severity != "high" {
		t.Errorf("Severity = %q, want %q", issues[0].Severity, "high")
	}
	if len(issues[0].Labels) != 1 || issues[0].Labels[0] != "bug" {
		t.Errorf("Labels = %v, want [bug]", issues[0].Labels)
	}
}

func TestParseIssuesMultipleBlocks(t *testing.T) {
	output := "First issue:\n```issue\n{\"title\":\"Issue 1\",\"description\":\"Desc 1\"}\n```\nSome text\n```issue\n{\"title\":\"Issue 2\",\"description\":\"Desc 2\",\"severity\":\"low\"}\n```\n"
	issues := ParseIssues(output)

	if len(issues) != 2 {
		t.Fatalf("Expected 2 issues, got %d", len(issues))
	}
	if issues[0].Title != "Issue 1" {
		t.Errorf("First title = %q, want %q", issues[0].Title, "Issue 1")
	}
	if issues[1].Title != "Issue 2" {
		t.Errorf("Second title = %q, want %q", issues[1].Title, "Issue 2")
	}
	if issues[1].Severity != "low" {
		t.Errorf("Second severity = %q, want %q", issues[1].Severity, "low")
	}
}

func TestParseIssuesMixedWithCodeBlocks(t *testing.T) {
	output := "```python\nprint('hello')\n```\n```issue\n{\"title\":\"Found issue\",\"description\":\"A problem\"}\n```\n```go\nfmt.Println()\n```\n"
	issues := ParseIssues(output)

	if len(issues) != 1 {
		t.Fatalf("Expected 1 issue (code blocks ignored), got %d", len(issues))
	}
	if issues[0].Title != "Found issue" {
		t.Errorf("Title = %q, want %q", issues[0].Title, "Found issue")
	}
}

func TestParseIssuesMalformedJSON(t *testing.T) {
	output := "```issue\n{not valid json}\n```\n"
	issues := ParseIssues(output)

	if len(issues) != 0 {
		t.Fatalf("Expected 0 issues (malformed JSON skipped), got %d", len(issues))
	}
}

func TestParseIssuesMissingRequiredFields(t *testing.T) {
	tests := []struct {
		name  string
		block string
	}{
		{"missing title", `{"description":"some desc"}`},
		{"missing description", `{"title":"some title"}`},
		{"empty title", `{"title":"","description":"desc"}`},
		{"empty description", `{"title":"title","description":""}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			output := "```issue\n" + tt.block + "\n```\n"
			issues := ParseIssues(output)
			if len(issues) != 0 {
				t.Errorf("Expected 0 issues for %s, got %d", tt.name, len(issues))
			}
		})
	}
}

func TestParseIssuesEmptyOutput(t *testing.T) {
	issues := ParseIssues("")
	if len(issues) != 0 {
		t.Fatalf("Expected 0 issues from empty output, got %d", len(issues))
	}
}

func TestParseIssuesNoIssueBlocks(t *testing.T) {
	output := "Just some regular output\nwith multiple lines\nbut no issue blocks\n"
	issues := ParseIssues(output)
	if len(issues) != 0 {
		t.Fatalf("Expected 0 issues from output without blocks, got %d", len(issues))
	}
}

func TestParseIssuesEmptyBlock(t *testing.T) {
	output := "```issue\n\n```\n"
	issues := ParseIssues(output)
	if len(issues) != 0 {
		t.Fatalf("Expected 0 issues from empty block, got %d", len(issues))
	}
}
