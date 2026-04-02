package orchestrator

import (
	"strings"
	"testing"
)

func TestInjectIssueTemplate(t *testing.T) {
	prompt := "Build a login page"
	result := InjectIssueTemplate(prompt)

	if !strings.Contains(result, "## Issue Reporting") {
		t.Error("Expected issue reporting template to be injected")
	}
	if !strings.Contains(result, "```issue") {
		t.Error("Expected ```issue example in injected template")
	}
	if !strings.Contains(result, prompt) {
		t.Error("Expected original prompt to be preserved")
	}
}

func TestInjectIssueTemplateNoDoubleInjection(t *testing.T) {
	prompt := "Build a login page"
	first := InjectIssueTemplate(prompt)
	second := InjectIssueTemplate(first)

	count := strings.Count(second, "## Issue Reporting")
	if count != 1 {
		t.Errorf("Expected exactly 1 occurrence of template marker, got %d", count)
	}
}

func TestInjectIssueTemplatePreservesExistingContent(t *testing.T) {
	prompt := "Fix the API endpoint.\n\nRequirements:\n- Must handle errors\n- Return JSON"
	result := InjectIssueTemplate(prompt)

	if !strings.Contains(result, "Fix the API endpoint") {
		t.Error("Expected original content preserved")
	}
	if !strings.Contains(result, "Return JSON") {
		t.Error("Expected original requirements preserved")
	}
}
