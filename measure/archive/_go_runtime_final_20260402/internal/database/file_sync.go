package database

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/parser"
)

type FileSyncer struct {
	db *DB
}

func NewFileSyncer(db *DB) *FileSyncer {
	return &FileSyncer{db: db}
}

func (s *FileSyncer) SyncTaskToFile(projectPath, trackID, taskID string, task *Task) error {
	if projectPath == "" || task == nil {
		return nil
	}

	store := NewProjectStore(s.db)
	project, err := store.Get(projectPath)
	if err != nil || project == nil {
		return fmt.Errorf("project not found: %w", err)
	}

	planPath := findPlanPathForTrack(projectPath, trackID)
	if planPath == "" {
		return nil
	}

	newStatus := models.Status(task.Status)
	if newStatus == "" {
		newStatus = models.StatusTodo
	}

	return parser.WritePlanStatusByID(planPath, taskID, newStatus)
}

func (s *FileSyncer) SyncIssuesToFile(projectPath string, issue *Issue) error {
	if projectPath == "" || issue == nil {
		return nil
	}

	store := NewProjectStore(s.db)
	project, err := store.Get(projectPath)
	if err != nil || project == nil {
		return nil
	}

	issueDir := filepath.Join(projectPath, "measure", "broker", "open")
	if issue.Status == "resolved" {
		issueDir = filepath.Join(projectPath, "measure", "broker", "resolved")
	}

	if err := os.MkdirAll(issueDir, 0755); err != nil {
		return fmt.Errorf("failed to create issue dir: %w", err)
	}

	filename := issue.ID + ".md"
	path := filepath.Join(issueDir, filename)

	content := formatIssueForFile(issue)
	return os.WriteFile(path, []byte(content), 0644)
}

func findPlanPathForTrack(projectPath, trackID string) string {
	measureDir := filepath.Join(projectPath, "measure", "tracks")
	entries, err := os.ReadDir(measureDir)
	if err != nil {
		return ""
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		planPath := filepath.Join(measureDir, entry.Name(), "plan.md")
		if _, err := os.Stat(planPath); err == nil {
			return planPath
		}
	}
	return ""
}

func formatIssueForFile(issue *Issue) string {
	lines := []string{
		"---",
		fmt.Sprintf("id: %s", issue.ID),
		fmt.Sprintf("title: %s", issue.Title),
		fmt.Sprintf("type: %s", issue.Type),
		fmt.Sprintf("status: %s", issue.Status),
	}
	if issue.RelatedTask != "" {
		lines = append(lines, fmt.Sprintf("relatedTask: %s", issue.RelatedTask))
	}
	lines = append(lines, "---")
	lines = append(lines, "")
	lines = append(lines, "# "+issue.Title)
	if issue.Description != "" {
		lines = append(lines, "")
		lines = append(lines, issue.Description)
	}
	lines = append(lines, "")
	lines = append(lines, fmt.Sprintf("*Created: %s*", time.Unix(issue.CreatedAt, 0).Format(time.RFC3339)))
	if issue.UpdatedAt > 0 {
		lines = append(lines, fmt.Sprintf("*Updated: %s*", time.Unix(issue.UpdatedAt, 0).Format(time.RFC3339)))
	}
	return joinLines(lines)
}

func joinLines(lines []string) string {
	result := ""
	for i, line := range lines {
		result += line
		if i < len(lines)-1 {
			result += "\n"
		}
	}
	return result
}

type FileLoader struct {
	db *DB
}

func NewFileLoader(db *DB) *FileLoader {
	return &FileLoader{db: db}
}

func (l *FileLoader) LoadProjectsFromFiles(rootDir string) error {
	entries, err := os.ReadDir(rootDir)
	if err != nil {
		return err
	}

	projectStore := NewProjectStore(l.db)

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		projectPath := filepath.Join(rootDir, entry.Name())
		measurePath := filepath.Join(projectPath, "measure")

		if _, err := os.Stat(measurePath); os.IsNotExist(err) {
			continue
		}

		project := &Project{
			ID:          entry.Name(),
			Name:        entry.Name(),
			Path:        projectPath,
			LastUpdated: time.Now().Unix(),
		}
		projectStore.Save(project)
	}

	return nil
}
