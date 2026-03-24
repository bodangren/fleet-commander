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
	statusRegex  = regexp.MustCompile(`^\s*-\s*\[(x|~| )\]\s*(.*)`)
	phaseRegex   = regexp.MustCompile(`^##\s+(.+)$`)
	agentRegex   = regexp.MustCompile(`@(\w+)`)
	linkRegex    = regexp.MustCompile(`\*.*\*Track:\s+(.+)\s+.*Link:\s+\[(.+)\]\(.+\)`)
	archivedRegex = regexp.MustCompile(`^##\s+Archived\s+Tracks$`)
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

	for scanner.Scan() {
		line := scanner.Text()

		if archivedRegex.MatchString(line) {
			inArchived = true
			continue
		}

		if inArchived {
			continue
		}

		if strings.TrimSpace(line) == "" || strings.TrimSpace(line) == "---" {
			continue
		}

		matches := linkRegex.FindStringSubmatch(line)
		if len(matches) == 3 {
			status := "todo"
			trackLine := strings.TrimSpace(line)
			if strings.HasPrefix(trackLine, "- [x]") {
				status = "done"
			} else if strings.HasPrefix(trackLine, "- [~]") {
				status = "active"
			}

			track := &models.Track{
				ID:          extractTrackID(matches[2]),
				Name:        matches[1],
				Type:        "feature",
				Description: "",
				Status:      status,
				PlanPath:    matches[2],
				Phases:      []*models.Phase{},
			}
			tracks = append(tracks, track)
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

			task := &models.Task{
				ID:          taskID,
				Description: description,
				Status:      status,
				AgentTag:    agentTag,
				Phase:       currentPhase.Name,
			}

			currentPhase.Tasks = append(currentPhase.Tasks, task)
		}
	}

	if currentPhase != nil {
		phases = append(phases, currentPhase)
	}

	return phases, scanner.Err()
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