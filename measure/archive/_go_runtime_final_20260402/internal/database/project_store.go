package database

import (
	"database/sql"
	"fmt"
	"time"
)

type Project struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Path        string `json:"path"`
	LastUpdated int64  `json:"lastUpdated"`
}

type ProjectStore struct {
	db *DB
}

func NewProjectStore(db *DB) *ProjectStore {
	return &ProjectStore{db: db}
}

func (s *ProjectStore) Get(id string) (*Project, error) {
	var p Project
	err := s.db.QueryRow(
		"SELECT id, name, path, last_updated FROM projects WHERE id = ?",
		id,
	).Scan(&p.ID, &p.Name, &p.Path, &p.LastUpdated)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get project: %w", err)
	}
	return &p, nil
}

func (s *ProjectStore) List() ([]Project, error) {
	rows, err := s.db.Query("SELECT id, name, path, last_updated FROM projects ORDER BY name")
	if err != nil {
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Path, &p.LastUpdated); err != nil {
			return nil, fmt.Errorf("failed to scan project: %w", err)
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func (s *ProjectStore) Save(p *Project) error {
	p.LastUpdated = time.Now().Unix()
	_, err := s.db.Exec(`
		INSERT INTO projects (id, name, path, last_updated)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			path = excluded.path,
			last_updated = excluded.last_updated
	`, p.ID, p.Name, p.Path, p.LastUpdated)
	if err != nil {
		return fmt.Errorf("failed to save project: %w", err)
	}
	return nil
}

func (s *ProjectStore) Delete(id string) error {
	_, err := s.db.Exec("DELETE FROM projects WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}
	return nil
}
