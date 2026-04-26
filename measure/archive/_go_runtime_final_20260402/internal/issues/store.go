package issues

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var frontMatterRegex = strings.NewReplacer(
	"---", "",
	"id:", "",
	"title:", "",
	"description:", "",
	"type:", "",
	"status:", "",
	"relatedTask:", "",
)

type Store struct {
	issuesDir string
}

func NewStore(issuesDir string) *Store {
	return &Store{issuesDir: issuesDir}
}

func (s *Store) IssuesDir() string {
	return s.issuesDir
}

func (s *Store) ensureDir() error {
	if s.issuesDir == "" {
		return fmt.Errorf("issues directory not configured")
	}
	return os.MkdirAll(s.issuesDir, 0755)
}

func (s *Store) Save(issue *Issue) error {
	if err := s.ensureDir(); err != nil {
		return err
	}

	filename := issue.ID + ".md"
	path := filepath.Join(s.issuesDir, filename)

	content := formatIssueAsMarkdown(issue)
	return os.WriteFile(path, []byte(content), 0644)
}

func (s *Store) Get(id string) (*Issue, error) {
	if s.issuesDir == "" {
		return nil, fmt.Errorf("issues directory not configured")
	}

	filename := id + ".md"
	path := filepath.Join(s.issuesDir, filename)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to read issue file: %w", err)
	}

	return parseIssueFromMarkdown(string(data), id)
}

func (s *Store) List() ([]Issue, error) {
	if s.issuesDir == "" {
		return []Issue{}, nil
	}

	entries, err := os.ReadDir(s.issuesDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []Issue{}, nil
		}
		return nil, fmt.Errorf("failed to read issues directory: %w", err)
	}

	var issues []Issue
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".md") {
			continue
		}

		id := strings.TrimSuffix(entry.Name(), ".md")
		issue, err := s.Get(id)
		if err != nil {
			continue
		}
		if issue != nil {
			issues = append(issues, *issue)
		}
	}

	return issues, nil
}

func (s *Store) ListByStatus(status IssueStatus) ([]Issue, error) {
	all, err := s.List()
	if err != nil {
		return nil, err
	}

	var filtered []Issue
	for _, issue := range all {
		if issue.Status == status {
			filtered = append(filtered, issue)
		}
	}

	return filtered, nil
}

func (s *Store) Delete(id string) error {
	if s.issuesDir == "" {
		return fmt.Errorf("issues directory not configured")
	}

	filename := id + ".md"
	path := filepath.Join(s.issuesDir, filename)

	err := os.Remove(path)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func formatIssueAsMarkdown(issue *Issue) string {
	lines := []string{
		"---",
		fmt.Sprintf("id: %s", issue.ID),
		fmt.Sprintf("title: %s", issue.Title),
	}
	if issue.Description != "" {
		lines = append(lines, fmt.Sprintf("description: %s", issue.Description))
	}
	if issue.Type != "" {
		lines = append(lines, fmt.Sprintf("type: %s", issue.Type))
	}
	if issue.Status != "" {
		lines = append(lines, fmt.Sprintf("status: %s", issue.Status))
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
	lines = append(lines, fmt.Sprintf("*Created: %s*", issue.CreatedAt.Format(time.RFC3339)))
	if !issue.UpdatedAt.IsZero() {
		lines = append(lines, fmt.Sprintf("*Updated: %s*", issue.UpdatedAt.Format(time.RFC3339)))
	}

	return strings.Join(lines, "\n")
}

func parseIssueFromMarkdown(content, id string) (*Issue, error) {
	issue := &Issue{ID: id}

	lines := strings.Split(content, "\n")
	inFrontMatter := false

	for _, line := range lines {
		line = strings.TrimSpace(line)

		if line == "---" {
			inFrontMatter = !inFrontMatter
			continue
		}

		if inFrontMatter {
			if strings.HasPrefix(line, "title:") {
				issue.Title = strings.TrimSpace(strings.TrimPrefix(line, "title:"))
			} else if strings.HasPrefix(line, "description:") {
				issue.Description = strings.TrimSpace(strings.TrimPrefix(line, "description:"))
			} else if strings.HasPrefix(line, "type:") {
				issue.Type = IssueType(strings.TrimSpace(strings.TrimPrefix(line, "type:")))
			} else if strings.HasPrefix(line, "status:") {
				issue.Status = IssueStatus(strings.TrimSpace(strings.TrimPrefix(line, "status:")))
			} else if strings.HasPrefix(line, "relatedTask:") {
				issue.RelatedTask = strings.TrimSpace(strings.TrimPrefix(line, "relatedTask:"))
			}
		}
	}

	if issue.Title == "" {
		return nil, fmt.Errorf("issue missing title")
	}

	return issue, nil
}
