package database

import (
	"database/sql"
	"fmt"
	"time"
)

// OverviewStats holds cross-project aggregate statistics.
type OverviewStats struct {
	TotalProjects  int `json:"totalProjects"`
	TotalTasks     int `json:"totalTasks"`
	CompletedTasks int `json:"completedTasks"`
	ActiveAgents   int `json:"activeAgents"`
	OpenIssues     int `json:"openIssues"`
}

// AgentStats holds per-agent utilization metrics.
type AgentStats struct {
	AgentName       string  `json:"agentName"`
	TotalExecutions int     `json:"totalExecutions"`
	TotalDurationMs int64   `json:"totalDurationMs"`
	SuccessCount    int     `json:"successCount"`
	Utilization     float64 `json:"utilization"`
}

// IssueStats holds issue resolution analytics.
type IssueStats struct {
	OpenCount          int     `json:"openCount"`
	ResolvedCount      int     `json:"resolvedCount"`
	AvgResolutionHours float64 `json:"avgResolutionHours"`
}

// DailyVelocity represents tasks completed on a given day.
type DailyVelocity struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// StatsStore provides aggregation queries across all projects.
type StatsStore struct {
	db *DB
}

// NewStatsStore creates a new StatsStore.
func NewStatsStore(db *DB) *StatsStore {
	return &StatsStore{db: db}
}

// GetOverviewStats returns cross-project aggregate counts.
func (s *StatsStore) GetOverviewStats() (*OverviewStats, error) {
	stats := &OverviewStats{}

	err := s.db.QueryRow("SELECT COUNT(*) FROM projects").Scan(&stats.TotalProjects)
	if err != nil {
		return nil, fmt.Errorf("count projects: %w", err)
	}

	err = s.db.QueryRow("SELECT COUNT(*) FROM tasks").Scan(&stats.TotalTasks)
	if err != nil {
		return nil, fmt.Errorf("count tasks: %w", err)
	}

	err = s.db.QueryRow("SELECT COUNT(*) FROM tasks WHERE status IN ('done', 'completed')").Scan(&stats.CompletedTasks)
	if err != nil {
		return nil, fmt.Errorf("count completed tasks: %w", err)
	}

	err = s.db.QueryRow("SELECT COUNT(DISTINCT agent_name) FROM execution_logs WHERE agent_name != ''").Scan(&stats.ActiveAgents)
	if err != nil {
		return nil, fmt.Errorf("count active agents: %w", err)
	}

	err = s.db.QueryRow("SELECT COUNT(*) FROM issues WHERE status = 'open'").Scan(&stats.OpenIssues)
	if err != nil {
		return nil, fmt.Errorf("count open issues: %w", err)
	}

	return stats, nil
}

// GetAgentStats returns per-agent utilization metrics.
func (s *StatsStore) GetAgentStats(from, to int64) ([]AgentStats, error) {
	query := `
		SELECT agent_name, COUNT(*) as total, COALESCE(SUM(duration_ms), 0) as total_ms,
		       COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count
		FROM execution_logs
		WHERE agent_name != ''`

	args := []interface{}{}
	if from > 0 {
		query += " AND timestamp >= ?"
		args = append(args, from)
	}
	if to > 0 {
		query += " AND timestamp <= ?"
		args = append(args, to)
	}
	query += " GROUP BY agent_name ORDER BY total_ms DESC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("query agent stats: %w", err)
	}
	defer rows.Close()

	var result []AgentStats
	var totalMs int64

	for rows.Next() {
		var a AgentStats
		if err := rows.Scan(&a.AgentName, &a.TotalExecutions, &a.TotalDurationMs, &a.SuccessCount); err != nil {
			return nil, fmt.Errorf("scan agent stats: %w", err)
		}
		totalMs += a.TotalDurationMs
		result = append(result, a)
	}

	// Calculate utilization as percentage of total
	if totalMs > 0 {
		for i := range result {
			result[i].Utilization = float64(result[i].TotalDurationMs) / float64(totalMs) * 100
		}
	}

	return result, rows.Err()
}

// GetIssueStats returns issue resolution analytics.
func (s *StatsStore) GetIssueStats() (*IssueStats, error) {
	stats := &IssueStats{}

	err := s.db.QueryRow("SELECT COUNT(*) FROM issues WHERE status = 'open'").Scan(&stats.OpenCount)
	if err != nil {
		return nil, fmt.Errorf("count open issues: %w", err)
	}

	err = s.db.QueryRow("SELECT COUNT(*) FROM issues WHERE status = 'resolved'").Scan(&stats.ResolvedCount)
	if err != nil {
		return nil, fmt.Errorf("count resolved issues: %w", err)
	}

	var avgSeconds sql.NullFloat64
	err = s.db.QueryRow(`
		SELECT AVG(updated_at - created_at)
		FROM issues
		WHERE status = 'resolved' AND updated_at IS NOT NULL AND updated_at > 0 AND created_at > 0
	`).Scan(&avgSeconds)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("avg resolution time: %w", err)
	}
	if avgSeconds.Valid {
		stats.AvgResolutionHours = avgSeconds.Float64 / 3600
	}

	return stats, nil
}

// GetVelocity returns daily task completion counts for the given number of days.
func (s *StatsStore) GetVelocity(days int) ([]DailyVelocity, error) {
	if days <= 0 {
		days = 30
	}

	cutoff := time.Now().AddDate(0, 0, -days).Unix()

	rows, err := s.db.Query(`
		SELECT DATE(timestamp, 'unixepoch') as day, COUNT(*) as count
		FROM execution_logs
		WHERE status = 'success' AND timestamp >= ?
		GROUP BY day
		ORDER BY day ASC
	`, cutoff)
	if err != nil {
		return nil, fmt.Errorf("query velocity: %w", err)
	}
	defer rows.Close()

	var result []DailyVelocity
	for rows.Next() {
		var v DailyVelocity
		if err := rows.Scan(&v.Date, &v.Count); err != nil {
			return nil, fmt.Errorf("scan velocity: %w", err)
		}
		result = append(result, v)
	}

	return result, rows.Err()
}
