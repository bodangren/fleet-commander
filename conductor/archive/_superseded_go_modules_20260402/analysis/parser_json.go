package analysis

import (
	"encoding/json"
	"fmt"
)

// golangciLintOutput matches the JSON schema emitted by golangci-lint.
type golangciLintOutput struct {
	Issues []golangciIssue `json:"Issues"`
}

type golangciIssue struct {
	FromLinter string        `json:"FromLinter"`
	Text       string        `json:"Text"`
	Pos        golangciPos   `json:"Pos"`
	Severity   string        `json:"Severity"`
}

type golangciPos struct {
	Filename string `json:"Filename"`
	Line     int    `json:"Line"`
	Column   int    `json:"Column"`
}

// eslintFile matches one entry in the ESLint JSON array output.
type eslintFile struct {
	FilePath string          `json:"filePath"`
	Messages []eslintMessage `json:"messages"`
}

type eslintMessage struct {
	RuleID   string `json:"ruleId"`
	Message  string `json:"message"`
	Line     int    `json:"line"`
	Column   int    `json:"column"`
	Severity int    `json:"severity"` // 1=warning, 2=error
}

// ParseJSON attempts to parse output as golangci-lint JSON first, then ESLint JSON.
func ParseJSON(data []byte, toolName string) ([]AnalysisResult, error) {
	if len(data) == 0 {
		return nil, nil
	}

	// Try golangci-lint format (object with Issues key).
	if data[0] == '{' {
		return parseGolangciLint(data, toolName)
	}

	// Try ESLint format (array).
	if data[0] == '[' {
		return parseESLint(data, toolName)
	}

	return nil, fmt.Errorf("unrecognized JSON format for tool %s", toolName)
}

func parseGolangciLint(data []byte, toolName string) ([]AnalysisResult, error) {
	var out golangciLintOutput
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, fmt.Errorf("golangci-lint JSON parse: %w", err)
	}

	results := make([]AnalysisResult, 0, len(out.Issues))
	for _, issue := range out.Issues {
		results = append(results, AnalysisResult{
			Tool:     toolName,
			File:     issue.Pos.Filename,
			Line:     issue.Pos.Line,
			Column:   issue.Pos.Column,
			Severity: issue.Severity,
			Message:  issue.Text,
			Rule:     issue.FromLinter,
		})
	}
	return results, nil
}

func parseESLint(data []byte, toolName string) ([]AnalysisResult, error) {
	var files []eslintFile
	if err := json.Unmarshal(data, &files); err != nil {
		return nil, fmt.Errorf("eslint JSON parse: %w", err)
	}

	var results []AnalysisResult
	for _, f := range files {
		for _, msg := range f.Messages {
			sev := "warning"
			if msg.Severity == 2 {
				sev = "error"
			}
			results = append(results, AnalysisResult{
				Tool:     toolName,
				File:     f.FilePath,
				Line:     msg.Line,
				Column:   msg.Column,
				Severity: sev,
				Message:  msg.Message,
				Rule:     msg.RuleID,
			})
		}
	}
	return results, nil
}
