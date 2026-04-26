package orchestrator

import "strings"

// IssueReportingTemplate instructs agents how to report issues they discover.
const IssueReportingTemplate = `

## Issue Reporting

If you discover any bugs, problems, or areas that need improvement during your work, report them using the following format. Place each issue in a fenced code block:

` + "```issue" + `
{"title": "Short issue title", "description": "Detailed description of the issue", "severity": "low|medium|high|critical", "labels": ["optional", "labels"]}
` + "```" + `

Fields:
- title (required): Brief summary of the issue
- description (required): Full details, steps to reproduce, or context
- severity (optional): low, medium, high, or critical
- labels (optional): Array of categorization labels

You may report multiple issues by using multiple fenced blocks.
`

// InjectIssueTemplate appends the issue reporting template to a prompt
// if it doesn't already contain it (prevents double-injection).
func InjectIssueTemplate(prompt string) string {
	const marker = "## Issue Reporting"
	if strings.Contains(prompt, marker) {
		return prompt
	}
	return prompt + IssueReportingTemplate
}
