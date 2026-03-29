package database

import (
	"database/sql"
	"fmt"
	"time"
)

type Task struct {
	ID          string `json:"id"`
	TrackID     string `json:"trackId"`
	Phase       string `json:"phase"`
	Description string `json:"description"`
	Status      string `json:"status"`
	AgentTag    string `json:"agentTag"`
	CreatedAt   int64  `json:"createdAt"`
}

type TaskStore struct {
	db *DB
}

func NewTaskStore(db *DB) *TaskStore {
	return &TaskStore{db: db}
}

func (s *TaskStore) Get(id string) (*Task, error) {
	var t Task
	err := s.db.QueryRow(`
		SELECT id, track_id, phase, description, status, agent_tag, created_at
		FROM tasks WHERE id = ?`,
		id,
	).Scan(&t.ID, &t.TrackID, &t.Phase, &t.Description, &t.Status, &t.AgentTag, &t.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get task: %w", err)
	}
	return &t, nil
}

func (s *TaskStore) ListByTrack(trackID string) ([]Task, error) {
	rows, err := s.db.Query(`
		SELECT id, track_id, phase, description, status, agent_tag, created_at
		FROM tasks WHERE track_id = ?
		ORDER BY created_at`,
		trackID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list tasks by track: %w", err)
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var t Task
		if err := rows.Scan(&t.ID, &t.TrackID, &t.Phase, &t.Description, &t.Status, &t.AgentTag, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

func (s *TaskStore) ListByStatus(status string) ([]Task, error) {
	rows, err := s.db.Query(`
		SELECT id, track_id, phase, description, status, agent_tag, created_at
		FROM tasks WHERE status = ?
		ORDER BY created_at`,
		status,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list tasks by status: %w", err)
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var t Task
		if err := rows.Scan(&t.ID, &t.TrackID, &t.Phase, &t.Description, &t.Status, &t.AgentTag, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

func (s *TaskStore) Save(t *Task) error {
	if t.CreatedAt == 0 {
		t.CreatedAt = time.Now().Unix()
	}
	_, err := s.db.Exec(`
		INSERT INTO tasks (id, track_id, phase, description, status, agent_tag, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			phase = excluded.phase,
			description = excluded.description,
			status = excluded.status,
			agent_tag = excluded.agent_tag
	`, t.ID, t.TrackID, t.Phase, t.Description, t.Status, t.AgentTag, t.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to save task: %w", err)
	}
	return nil
}

func (s *TaskStore) SaveBatch(tasks []Task) error {
	for _, t := range tasks {
		if err := s.Save(&t); err != nil {
			return err
		}
	}
	return nil
}

func (s *TaskStore) Delete(id string) error {
	_, err := s.db.Exec("DELETE FROM tasks WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}
	return nil
}
