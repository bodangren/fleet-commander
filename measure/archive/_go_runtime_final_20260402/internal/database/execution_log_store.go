package database

import (
	"database/sql"
	"fmt"
	"time"
)

type ExecutionLog struct {
	ID         string `json:"id"`
	ProjectID  string `json:"projectId"`
	TaskID     string `json:"taskId"`
	AgentName  string `json:"agentName"`
	Harness    string `json:"harness"`
	Command    string `json:"command"`
	Args       string `json:"args"`
	Output     string `json:"output"`
	Status     string `json:"status"`
	DurationMs int64  `json:"durationMs"`
	Timestamp  int64  `json:"timestamp"`
}

type ExecutionLogStore struct {
	db *DB
}

func NewExecutionLogStore(db *DB) *ExecutionLogStore {
	return &ExecutionLogStore{db: db}
}

func (s *ExecutionLogStore) Save(log *ExecutionLog) error {
	if log.Timestamp == 0 {
		log.Timestamp = time.Now().Unix()
	}
	_, err := s.db.Exec(`
		INSERT INTO execution_logs (id, project_id, task_id, agent_name, harness, command, args, output, status, duration_ms, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, log.ID, log.ProjectID, log.TaskID, log.AgentName, log.Harness, log.Command, log.Args, log.Output, log.Status, log.DurationMs, log.Timestamp)
	if err != nil {
		return fmt.Errorf("failed to save execution log: %w", err)
	}
	return nil
}

func (s *ExecutionLogStore) ListByProject(projectID string, limit int) ([]ExecutionLog, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.Query(`
		SELECT id, project_id, task_id, agent_name, harness, command, args, output, status, duration_ms, timestamp
		FROM execution_logs WHERE project_id = ?
		ORDER BY timestamp DESC LIMIT ?`,
		projectID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list execution logs: %w", err)
	}
	defer rows.Close()

	var logs []ExecutionLog
	for rows.Next() {
		var l ExecutionLog
		if err := rows.Scan(&l.ID, &l.ProjectID, &l.TaskID, &l.AgentName, &l.Harness, &l.Command, &l.Args, &l.Output, &l.Status, &l.DurationMs, &l.Timestamp); err != nil {
			return nil, fmt.Errorf("failed to scan execution log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, rows.Err()
}

func (s *ExecutionLogStore) GetStats(projectID string) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	var total int64
	err := s.db.QueryRow("SELECT COUNT(*) FROM execution_logs WHERE project_id = ?", projectID).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}
	stats["total"] = total

	var successCount int64
	err = s.db.QueryRow("SELECT COUNT(*) FROM execution_logs WHERE project_id = ? AND status = 'success'", projectID).Scan(&successCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get success count: %w", err)
	}
	stats["successCount"] = successCount

	if total > 0 {
		stats["successRate"] = float64(successCount) / float64(total) * 100
	} else {
		stats["successRate"] = float64(0)
	}

	var avgDuration sql.NullInt64
	err = s.db.QueryRow("SELECT AVG(duration_ms) FROM execution_logs WHERE project_id = ? AND duration_ms IS NOT NULL", projectID).Scan(&avgDuration)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get avg duration: %w", err)
	}
	if avgDuration.Valid {
		stats["avgDurationMs"] = avgDuration.Int64
	}

	return stats, nil
}

func (s *ExecutionLogStore) GetByAgent(projectID string) (map[string]int, error) {
	rows, err := s.db.Query(`
		SELECT agent_name, COUNT(*) as count
		FROM execution_logs
		WHERE project_id = ?
		GROUP BY agent_name`,
		projectID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get by agent: %w", err)
	}
	defer rows.Close()

	result := make(map[string]int)
	for rows.Next() {
		var agentName string
		var count int64
		if err := rows.Scan(&agentName, &count); err != nil {
			return nil, fmt.Errorf("failed to scan agent stats: %w", err)
		}
		if agentName != "" {
			result[agentName] = int(count)
		}
	}
	return result, rows.Err()
}

func (s *ExecutionLogStore) Delete(projectID string, beforeTimestamp int64) error {
	_, err := s.db.Exec("DELETE FROM execution_logs WHERE project_id = ? AND timestamp < ?", projectID, beforeTimestamp)
	if err != nil {
		return fmt.Errorf("failed to delete old logs: %w", err)
	}
	return nil
}
