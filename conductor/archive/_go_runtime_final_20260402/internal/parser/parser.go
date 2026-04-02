package parser

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/conductor/fleet-commander/internal/models"
)

var (
	statusRegex    = regexp.MustCompile(`^\s*-\s*\[(x|~| )\]\s*(.*)`)
	phaseRegex     = regexp.MustCompile(`^##\s+(.+)$`)
	agentRegex     = regexp.MustCompile(`@(\w+)`)
	trackLineRegex = regexp.MustCompile(`^\s*-\s*\[(x|~| )\]\s+\*{0,2}Track:\s+(.+?)\*{0,2}\s*$`)
	linkLineRegex  = regexp.MustCompile(`_Link:\s+\[([^\]]+)\]\(([^)]+)\)_`)
	archivedRegex  = regexp.MustCompile(`^##\s+Archived\s+Tracks$`)
	dependsOnRegex = regexp.MustCompile(`\s+depends_on:\s*(.+)$`)
)

func ParseTracksRegistry(filePath string) ([]*models.Track, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open tracks.md: %w", err)
	}
	defer file.Close()

	var tracks []*models.Track
	scanner := bufio.NewScanner(file)
	inArchived := false

	// State machine: pending track waits for its link line
	type pendingTrack struct {
		status string
		name   string
	}
	var pending *pendingTrack

	for scanner.Scan() {
		line := scanner.Text()

		if archivedRegex.MatchString(line) {
			inArchived = true
			pending = nil
			continue
		}

		if inArchived {
			continue
		}

		// Check for track header line: - [ ] **Track: Name**
		if trackMatches := trackLineRegex.FindStringSubmatch(line); len(trackMatches) == 3 {
			statusSymbol := trackMatches[1]
			name := strings.TrimSpace(trackMatches[2])
			status := "todo"
			switch statusSymbol {
			case "x":
				status = "done"
			case "~":
				status = "active"
			}
			pending = &pendingTrack{status: status, name: name}
			continue
		}

		// Check for link line: _Link: [text](url)_
		if pending != nil {
			if linkMatches := linkLineRegex.FindStringSubmatch(line); len(linkMatches) == 3 {
				planPath := linkMatches[2]
				track := &models.Track{
					ID:          extractTrackID(planPath),
					Name:        pending.name,
					Type:        "feature",
					Description: "",
					Status:      pending.status,
					PlanPath:    planPath,
					Phases:      []*models.Phase{},
				}
				tracks = append(tracks, track)
				pending = nil
			}
		}
	}

	return tracks, scanner.Err()
}

func ParsePlan(filePath string) ([]*models.Phase, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open plan.md: %w", err)
	}
	defer file.Close()

	var phases []*models.Phase
	var currentPhase *models.Phase
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()

		if phaseMatches := phaseRegex.FindStringSubmatch(line); len(phaseMatches) == 2 {
			if currentPhase != nil {
				phases = append(phases, currentPhase)
			}
			currentPhase = &models.Phase{
				Name:  strings.TrimSpace(phaseMatches[1]),
				Tasks: []*models.Task{},
			}
			continue
		}

		if statusMatches := statusRegex.FindStringSubmatch(line); len(statusMatches) == 3 && currentPhase != nil {
			statusSymbol := statusMatches[1]
			description := strings.TrimSpace(statusMatches[2])

			var status models.Status
			switch statusSymbol {
			case "x":
				status = models.StatusDone
			case "~":
				status = models.StatusActive
			default:
				status = models.StatusTodo
			}

			taskID := fmt.Sprintf("%s-%d", sanitizeForID(currentPhase.Name), len(currentPhase.Tasks)+1)

			agentTag := ""
			if agentMatches := agentRegex.FindStringSubmatch(description); len(agentMatches) == 2 {
				agentTag = agentMatches[1]
			}

			dependencies := parseDependencies(description)

			task := &models.Task{
				ID:           taskID,
				Description:  description,
				Status:       status,
				AgentTag:     agentTag,
				Phase:        currentPhase.Name,
				Dependencies: dependencies,
			}

			currentPhase.Tasks = append(currentPhase.Tasks, task)
		}
	}

	if currentPhase != nil {
		phases = append(phases, currentPhase)
	}

	return phases, scanner.Err()
}

// WritePlanStatusByID finds the task matching taskID in planPath and updates
// its checkbox to reflect newStatus. Writes atomically (temp file + rename).
func WritePlanStatusByID(planPath, taskID string, newStatus models.Status) error {
	return writePlanStatus(planPath, taskID, "", newStatus)
}

// WritePlanStatus finds the task matching description in planPath and updates
// its checkbox to reflect newStatus. Writes atomically (temp file + rename).
func WritePlanStatus(planPath, description string, newStatus models.Status) error {
	return writePlanStatus(planPath, "", description, newStatus)
}

func writePlanStatus(planPath, taskID, description string, newStatus models.Status) error {
	data, err := os.ReadFile(planPath)
	if err != nil {
		return fmt.Errorf("failed to read plan file: %w", err)
	}

	lines := strings.Split(string(data), "\n")

	var newCheckbox string
	switch newStatus {
	case models.StatusDone:
		newCheckbox = "x"
	case models.StatusActive:
		newCheckbox = "~"
	default:
		newCheckbox = " "
	}

	updated := false
	currentPhase := ""
	taskIndex := 0
	for i, line := range lines {
		if phaseMatches := phaseRegex.FindStringSubmatch(line); len(phaseMatches) == 2 {
			currentPhase = strings.TrimSpace(phaseMatches[1])
			taskIndex = 0
			continue
		}

		matches := statusRegex.FindStringSubmatch(line)
		if len(matches) == 3 {
			taskIndex++
			lineDesc := strings.TrimSpace(matches[2])
			lineID := fmt.Sprintf("%s-%d", sanitizeForID(currentPhase), taskIndex)
			if (taskID != "" && lineID == taskID) || (taskID == "" && lineDesc == description) {
				// Replace the checkbox character
				lines[i] = statusRegex.ReplaceAllStringFunc(line, func(s string) string {
					return strings.Replace(s, "["+matches[1]+"]", "["+newCheckbox+"]", 1)
				})
				updated = true
				break
			}
		}
	}

	if !updated {
		identifier := description
		if taskID != "" {
			identifier = taskID
		}
		return fmt.Errorf("task not found in plan: %s", identifier)
	}

	newData := strings.Join(lines, "\n")
	tmpPath := planPath + ".tmp"
	if err := os.WriteFile(tmpPath, []byte(newData), 0644); err != nil {
		return fmt.Errorf("failed to write temp file: %w", err)
	}
	if err := os.Rename(tmpPath, planPath); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("failed to rename temp file: %w", err)
	}
	return nil
}

func extractTrackID(link string) string {
	parts := strings.Split(strings.TrimSuffix(link, "/"), "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return link
}

func sanitizeForID(s string) string {
	s = strings.ToLower(s)
	s = regexp.MustCompile(`[^a-z0-9-]+`).ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

func parseDependencies(description string) []string {
	matches := dependsOnRegex.FindStringSubmatch(description)
	if len(matches) < 2 || strings.TrimSpace(matches[1]) == "" {
		return nil
	}

	deps := strings.Split(matches[1], ",")
	var result []string
	for _, dep := range deps {
		trimmed := strings.TrimSpace(dep)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func ResolvePlanPath(projectPath, planPath string) string {
	p := planPath
	if len(p) > 0 && p[len(p)-1] == '/' {
		p = p[:len(p)-1]
	}
	if len(p) < 3 || p[len(p)-3:] != ".md" {
		p = p + "/plan.md"
	}
	if len(p) > 0 && p[0] != '/' {
		p = projectPath + "/conductor/" + p
	}
	return p
}
