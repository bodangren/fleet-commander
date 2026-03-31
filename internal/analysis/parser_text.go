package analysis

import (
	"bufio"
	"bytes"
	"regexp"
	"strconv"
	"strings"
)

// textPattern matches lines of the form: file:line:col: severity: message
var textPattern = regexp.MustCompile(
	`^(.+?):(\d+):(\d+):\s*(error|warning|info):\s*(.+)$`,
)

// ParseText parses newline-delimited text output where each line matches
// file:line:col: severity: message.
func ParseText(data []byte, toolName string) ([]AnalysisResult, error) {
	var results []AnalysisResult

	scanner := bufio.NewScanner(bytes.NewReader(data))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		matches := textPattern.FindStringSubmatch(line)
		if matches == nil {
			continue
		}

		lineNum, _ := strconv.Atoi(matches[2])
		colNum, _ := strconv.Atoi(matches[3])

		results = append(results, AnalysisResult{
			Tool:     toolName,
			File:     matches[1],
			Line:     lineNum,
			Column:   colNum,
			Severity: matches[4],
			Message:  matches[5],
		})
	}

	return results, scanner.Err()
}
