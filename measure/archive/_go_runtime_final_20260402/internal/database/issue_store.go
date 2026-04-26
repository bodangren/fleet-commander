package database

import (
	"database/sql"
	"fmt"
	"time"
)

type Issue struct {
	ID          string `json:"id"`
	ProjectID   string `json:"projectId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Status      string `json:"status"`
	RelatedTask string `json:"relatedTask"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

type IssueStore struct {
	db *DB
}

func NewIssueStore(db *DB) *IssueStore {
	return &IssueStore{db: db}
}

func (s *IssueStore) Get(id string) (*Issue, error) {
	var i Issue
	var updatedAt sql.NullInt64
	err := s.db.QueryRow(`
		SELECT id, project_id, title, description, type, status, related_task, created_at, updated_at
		FROM issues WHERE id = ?`,
		id,
	).Scan(&i.ID, &i.ProjectID, &i.Title, &i.Description, &i.Type, &i.Status, &i.RelatedTask, &i.CreatedAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get issue: %w", err)
	}
	if updatedAt.Valid {
		i.UpdatedAt = updatedAt.Int64
	}
	return &i, nil
}

func (s *IssueStore) ListByProject(projectID string) ([]Issue, error) {
	rows, err := s.db.Query(`
		SELECT id, project_id, title, description, type, status, related_task, created_at, updated_at
		FROM issues WHERE project_id = ?
		ORDER BY created_at DESC`,
		projectID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list issues by project: %w", err)
	}
	defer rows.Close()

	return s.scanIssues(rows)
}

func (s *IssueStore) ListByStatus(status string) ([]Issue, error) {
	rows, err := s.db.Query(`
		SELECT id, project_id, title, description, type, status, related_task, created_at, updated_at
		FROM issues WHERE status = ?
		ORDER BY created_at DESC`,
		status,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list issues by status: %w", err)
	}
	defer rows.Close()

	return s.scanIssues(rows)
}

func (s *IssueStore) ListByProjectAndStatus(projectID, status string) ([]Issue, error) {
	rows, err := s.db.Query(`
		SELECT id, project_id, title, description, type, status, related_task, created_at, updated_at
		FROM issues WHERE project_id = ? AND status = ?
		ORDER BY created_at DESC`,
		projectID, status,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list issues: %w", err)
	}
	defer rows.Close()

	return s.scanIssues(rows)
}

func (s *IssueStore) scanIssues(rows *sql.Rows) ([]Issue, error) {
	var issues []Issue
	for rows.Next() {
		var i Issue
		var updatedAt sql.NullInt64
		if err := rows.Scan(&i.ID, &i.ProjectID, &i.Title, &i.Description, &i.Type, &i.Status, &i.RelatedTask, &i.CreatedAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan issue: %w", err)
		}
		if updatedAt.Valid {
			i.UpdatedAt = updatedAt.Int64
		}
		issues = append(issues, i)
	}
	return issues, rows.Err()
}

func (s *IssueStore) Save(i *Issue) error {
	if i.CreatedAt == 0 {
		i.CreatedAt = time.Now().Unix()
	}
	if i.UpdatedAt == 0 {
		i.UpdatedAt = time.Now().Unix()
	}
	_, err := s.db.Exec(`
		INSERT INTO issues (id, project_id, title, description, type, status, related_task, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			title = excluded.title,
			description = excluded.description,
			type = excluded.type,
			status = excluded.status,
			related_task = excluded.related_task,
			updated_at = excluded.updated_at
	`, i.ID, i.ProjectID, i.Title, i.Description, i.Type, i.Status, i.RelatedTask, i.CreatedAt, i.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to save issue: %w", err)
	}
	return nil
}

func (s *IssueStore) Delete(id string) error {
	_, err := s.db.Exec("DELETE FROM issues WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete issue: %w", err)
	}
	return nil
}
