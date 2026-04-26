package database

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/parser"
)

// MigrationResult holds stats from a filesystem-to-SQLite migration.
type MigrationResult struct {
	ProjectsImported int
	TracksImported   int
	TasksImported    int
	IssuesImported   int
	LogsImported     int
	Errors           []string
}

// Migrator migrates filesystem-based project data into SQLite.
type Migrator struct {
	db     *DB
	stores *Stores
	force  bool
}

// NewMigrator creates a new Migrator.
func NewMigrator(db *DB, force bool) *Migrator {
	return &Migrator{
		db:     db,
		stores: NewStores(db),
		force:  force,
	}
}

// MigrateProject migrates a single project directory into SQLite.
func (m *Migrator) MigrateProject(projectPath string) (*MigrationResult, error) {
	result := &MigrationResult{}

	measureDir := filepath.Join(projectPath, "measure")
	if _, err := os.Stat(measureDir); os.IsNotExist(err) {
		return nil, fmt.Errorf("no measure directory found at %s", projectPath)
	}

	projectName := filepath.Base(projectPath)
	projectID := projectName

	// Save project
	if err := m.stores.Projects.Save(&Project{
		ID:          projectID,
		Name:        projectName,
		Path:        projectPath,
		LastUpdated: time.Now().Unix(),
	}); err != nil {
		return nil, fmt.Errorf("failed to save project: %w", err)
	}
	result.ProjectsImported++

	// Parse and import tracks from tracks.md
	tracksFile := filepath.Join(measureDir, "tracks.md")
	if _, err := os.Stat(tracksFile); err == nil {
		tracks, err := parser.ParseTracksRegistry(tracksFile)
		if err != nil {
			msg := fmt.Sprintf("failed to parse tracks.md: %v", err)
			if !m.force {
				return result, fmt.Errorf("%s", msg)
			}
			result.Errors = append(result.Errors, msg)
		} else {
			for _, track := range tracks {
				if err := m.importTrack(projectID, projectPath, track, result); err != nil {
					msg := fmt.Sprintf("failed to import track %s: %v", track.Name, err)
					if !m.force {
						return result, fmt.Errorf("%s", msg)
					}
					result.Errors = append(result.Errors, msg)
				}
			}
		}
	}

	// Import issues from broker/open/ and broker/resolved/
	m.importIssuesFromDir(projectID, filepath.Join(measureDir, "broker", "open"), "open", result)
	m.importIssuesFromDir(projectID, filepath.Join(measureDir, "broker", "resolved"), "resolved", result)

	// Import execution logs from logs/ directory
	m.importLogs(projectID, filepath.Join(measureDir, "logs", projectID), result)

	return result, nil
}

func (m *Migrator) importTrack(projectID, projectPath string, track *models.Track, result *MigrationResult) error {
	trackStatus := string(track.Status)
	if trackStatus == "" {
		trackStatus = "pending"
	}

	_, err := m.db.Exec(`
		INSERT INTO tracks (id, project_id, name, type, status, plan_path)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			type = excluded.type,
			status = excluded.status,
			plan_path = excluded.plan_path
	`, track.ID, projectID, track.Name, track.Type, trackStatus, track.PlanPath)
	if err != nil {
		return fmt.Errorf("failed to save track: %w", err)
	}
	result.TracksImported++

	// Parse plan.md for this track to import tasks
	if track.PlanPath != "" {
		planPath := parser.ResolvePlanPath(projectPath, track.PlanPath)
		if _, err := os.Stat(planPath); err == nil {
			phases, err := parser.ParsePlan(planPath)
			if err != nil {
				msg := fmt.Sprintf("failed to parse plan %s: %v", planPath, err)
				if !m.force {
					return fmt.Errorf("%s", msg)
				}
				result.Errors = append(result.Errors, msg)
			} else {
				for _, phase := range phases {
					for _, task := range phase.Tasks {
						if err := m.stores.Tasks.Save(&Task{
							ID:          task.ID,
							TrackID:     track.ID,
							Phase:       phase.Name,
							Description: task.Description,
							Status:      string(task.Status),
							AgentTag:    task.AgentTag,
						}); err != nil {
							result.Errors = append(result.Errors, fmt.Sprintf("task %s: %v", task.ID, err))
						} else {
							result.TasksImported++
						}
					}
				}
			}
		}
	}

	return nil
}

func (m *Migrator) importIssuesFromDir(projectID, dir, status string, result *MigrationResult) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return // directory may not exist
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".md") {
			continue
		}

		content, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("read issue %s: %v", entry.Name(), err))
			continue
		}

		issueID := strings.TrimSuffix(entry.Name(), ".md")
		title, description, relatedTask := parseIssueFrontmatter(string(content))
		if title == "" {
			title = issueID
		}

		issueType := "blocker"
		if strings.HasPrefix(issueID, "BUG-") {
			issueType = "bug"
		} else if strings.HasPrefix(issueID, "WARN-") {
			issueType = "warning"
		}

		if err := m.stores.Issues.Save(&Issue{
			ID:          issueID,
			ProjectID:   projectID,
			Title:       title,
			Description: description,
			Type:        issueType,
			Status:      status,
			RelatedTask: relatedTask,
			CreatedAt:   time.Now().Unix(),
		}); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("save issue %s: %v", issueID, err))
		} else {
			result.IssuesImported++
		}
	}
}

func parseIssueFrontmatter(content string) (title, description, relatedTask string) {
	lines := strings.Split(content, "\n")
	inFrontmatter := false
	frontmatterEnd := 0

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "---" {
			if !inFrontmatter {
				inFrontmatter = true
				continue
			}
			frontmatterEnd = i + 1
			break
		}
		if inFrontmatter {
			if strings.HasPrefix(trimmed, "title:") {
				title = strings.TrimSpace(strings.TrimPrefix(trimmed, "title:"))
			} else if strings.HasPrefix(trimmed, "relatedTask:") {
				relatedTask = strings.TrimSpace(strings.TrimPrefix(trimmed, "relatedTask:"))
			}
		}
	}

	if frontmatterEnd > 0 && frontmatterEnd < len(lines) {
		description = strings.TrimSpace(strings.Join(lines[frontmatterEnd:], "\n"))
	}

	return
}

func (m *Migrator) importLogs(projectID, logsDir string, result *MigrationResult) {
	entries, err := os.ReadDir(logsDir)
	if err != nil {
		return // directory may not exist
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".jsonl") {
			continue
		}

		data, err := os.ReadFile(filepath.Join(logsDir, entry.Name()))
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("read log file %s: %v", entry.Name(), err))
			continue
		}

		for _, line := range strings.Split(string(data), "\n") {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			var logEntry map[string]interface{}
			if err := json.Unmarshal([]byte(line), &logEntry); err != nil {
				continue
			}

			logID := fmt.Sprintf("%s-%d", projectID, result.LogsImported)
			if id, ok := logEntry["id"].(string); ok && id != "" {
				logID = id
			}

			var timestamp int64
			if ts, ok := logEntry["timestamp"].(string); ok {
				if t, err := time.Parse(time.RFC3339Nano, ts); err == nil {
					timestamp = t.Unix()
				}
			}
			if timestamp == 0 {
				timestamp = time.Now().Unix()
			}

			taskID, _ := getNestedString(logEntry, "data", "taskId")
			agentName, _ := getNestedString(logEntry, "data", "agentTag")
			if agentName == "" {
				agentName, _ = getNestedString(logEntry, "data", "agentName")
			}
			status, _ := getNestedString(logEntry, "data", "status")
			if status == "" {
				if t, ok := logEntry["type"].(string); ok {
					status = t
				}
			}

			var durationMs int64
			if dur, ok := getNestedFloat(logEntry, "data", "durationMs"); ok {
				durationMs = int64(dur)
			}

			if err := m.stores.ExecutionLogs.Save(&ExecutionLog{
				ID:         logID,
				ProjectID:  projectID,
				TaskID:     taskID,
				AgentName:  agentName,
				Status:     status,
				DurationMs: durationMs,
				Timestamp:  timestamp,
			}); err != nil {
				log.Printf("Warning: duplicate or failed log entry: %v", err)
			} else {
				result.LogsImported++
			}
		}
	}
}

func getNestedString(m map[string]interface{}, keys ...string) (string, bool) {
	current := m
	for i, key := range keys {
		if i == len(keys)-1 {
			if v, ok := current[key].(string); ok {
				return v, true
			}
			return "", false
		}
		if nested, ok := current[key].(map[string]interface{}); ok {
			current = nested
		} else {
			return "", false
		}
	}
	return "", false
}

func getNestedFloat(m map[string]interface{}, keys ...string) (float64, bool) {
	current := m
	for i, key := range keys {
		if i == len(keys)-1 {
			if v, ok := current[key].(float64); ok {
				return v, true
			}
			return 0, false
		}
		if nested, ok := current[key].(map[string]interface{}); ok {
			current = nested
		} else {
			return 0, false
		}
	}
	return 0, false
}
