package agents

import (
	"bufio"
	"bytes"
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

const frontmatterDelimiter = "---"

func ParseDefinition(data []byte) (*Definition, error) {
	frontmatter, body, err := splitFrontmatter(data)
	if err != nil {
		return nil, err
	}

	var def Definition
	if err := yaml.Unmarshal(frontmatter, &def); err != nil {
		return nil, fmt.Errorf("failed to parse agent frontmatter: %w", err)
	}

	if def.Model != "" && !strings.Contains(def.Model, "/") {
		return nil, fmt.Errorf("agent model %q must use harness/model format", def.Model)
	}

	def.Body = strings.TrimLeft(strings.TrimRight(body, "\n"), "\n")
	return &def, nil
}

func MarshalDefinition(def *Definition) ([]byte, error) {
	if def == nil {
		return nil, fmt.Errorf("definition is nil")
	}
	if def.Description == "" {
		return nil, fmt.Errorf("description is required")
	}

	frontmatter := struct {
		Description string          `yaml:"description"`
		Mode        string          `yaml:"mode"`
		Model       string          `yaml:"model"`
		Temperature float64         `yaml:"temperature"`
		Tools       map[string]bool `yaml:"tools"`
	}{
		Description: def.Description,
		Mode:        def.Mode,
		Model:       def.Model,
		Temperature: def.Temperature,
		Tools:       def.Tools,
	}

	frontmatterBytes, err := yaml.Marshal(frontmatter)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal frontmatter: %w", err)
	}

	body := strings.TrimRight(def.Body, "\n")
	var buf bytes.Buffer
	buf.WriteString(frontmatterDelimiter)
	buf.WriteString("\n")
	buf.Write(frontmatterBytes)
	buf.WriteString(frontmatterDelimiter)
	buf.WriteString("\n\n")
	if body != "" {
		buf.WriteString(body)
		buf.WriteString("\n")
	}

	return buf.Bytes(), nil
}

func splitFrontmatter(data []byte) ([]byte, string, error) {
	scanner := bufio.NewScanner(bytes.NewReader(data))
	if !scanner.Scan() {
		return nil, "", fmt.Errorf("agent file is empty")
	}
	if strings.TrimSpace(scanner.Text()) != frontmatterDelimiter {
		return nil, "", fmt.Errorf("agent file missing frontmatter delimiter")
	}

	var frontmatterLines []string
	foundClosing := false
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == frontmatterDelimiter {
			foundClosing = true
			break
		}
		frontmatterLines = append(frontmatterLines, line)
	}

	if err := scanner.Err(); err != nil {
		return nil, "", fmt.Errorf("failed to scan frontmatter: %w", err)
	}
	if !foundClosing {
		return nil, "", fmt.Errorf("agent file missing closing frontmatter delimiter")
	}

	rest := ""
	if scanner.Scan() {
		var bodyLines []string
		bodyLines = append(bodyLines, scanner.Text())
		for scanner.Scan() {
			bodyLines = append(bodyLines, scanner.Text())
		}
		if err := scanner.Err(); err != nil {
			return nil, "", fmt.Errorf("failed to scan body: %w", err)
		}
		rest = strings.Join(bodyLines, "\n")
	}

	return []byte(strings.Join(frontmatterLines, "\n")), rest, nil
}
