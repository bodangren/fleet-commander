package database

import (
	"testing"
	"time"
)

func seedStatsDB(t *testing.T, db *DB) {
	t.Helper()
	stores := NewStores(db)

	// Create projects
	stores.Projects.Save(&Project{ID: "p1", Name: "Project A", Path: "/tmp/a"})
	stores.Projects.Save(&Project{ID: "p2", Name: "Project B", Path: "/tmp/b"})

	// Create tracks and tasks
	db.Exec(`INSERT INTO tracks (id, project_id, name, type, status) VALUES ('t1', 'p1', 'Track1', 'feature', 'active')`)
	db.Exec(`INSERT INTO tracks (id, project_id, name, type, status) VALUES ('t2', 'p2', 'Track2', 'feature', 'active')`)

	stores.Tasks.Save(&Task{ID: "task1", TrackID: "t1", Phase: "Phase 1", Description: "Task 1", Status: "done"})
	stores.Tasks.Save(&Task{ID: "task2", TrackID: "t1", Phase: "Phase 1", Description: "Task 2", Status: "todo"})
	stores.Tasks.Save(&Task{ID: "task3", TrackID: "t2", Phase: "Phase 1", Description: "Task 3", Status: "done"})

	// Create issues
	now := time.Now().Unix()
	stores.Issues.Save(&Issue{ID: "iss1", ProjectID: "p1", Title: "Bug 1", Type: "blocker", Status: "open", CreatedAt: now - 3600})
	stores.Issues.Save(&Issue{ID: "iss2", ProjectID: "p1", Title: "Bug 2", Type: "bug", Status: "resolved", CreatedAt: now - 7200, UpdatedAt: now - 3600})

	// Create execution logs
	stores.ExecutionLogs.Save(&ExecutionLog{ID: "log1", ProjectID: "p1", AgentName: "coder", Status: "success", DurationMs: 5000, Timestamp: now - 100})
	stores.ExecutionLogs.Save(&ExecutionLog{ID: "log2", ProjectID: "p1", AgentName: "coder", Status: "success", DurationMs: 3000, Timestamp: now - 50})
	stores.ExecutionLogs.Save(&ExecutionLog{ID: "log3", ProjectID: "p2", AgentName: "reviewer", Status: "success", DurationMs: 2000, Timestamp: now - 25})
	stores.ExecutionLogs.Save(&ExecutionLog{ID: "log4", ProjectID: "p1", AgentName: "coder", Status: "error", DurationMs: 1000, Timestamp: now - 10})
}

func TestGetOverviewStats(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()
	seedStatsDB(t, db)

	ss := NewStatsStore(db)
	stats, err := ss.GetOverviewStats()
	if err != nil {
		t.Fatalf("GetOverviewStats() error: %v", err)
	}

	if stats.TotalProjects != 2 {
		t.Errorf("expected 2 projects, got %d", stats.TotalProjects)
	}
	if stats.TotalTasks != 3 {
		t.Errorf("expected 3 tasks, got %d", stats.TotalTasks)
	}
	if stats.CompletedTasks != 2 {
		t.Errorf("expected 2 completed tasks, got %d", stats.CompletedTasks)
	}
	if stats.ActiveAgents != 2 {
		t.Errorf("expected 2 active agents, got %d", stats.ActiveAgents)
	}
	if stats.OpenIssues != 1 {
		t.Errorf("expected 1 open issue, got %d", stats.OpenIssues)
	}
}

func TestGetAgentStats(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()
	seedStatsDB(t, db)

	ss := NewStatsStore(db)
	agents, err := ss.GetAgentStats(0, 0)
	if err != nil {
		t.Fatalf("GetAgentStats() error: %v", err)
	}

	if len(agents) != 2 {
		t.Fatalf("expected 2 agents, got %d", len(agents))
	}

	// First should be "coder" with highest total_ms
	if agents[0].AgentName != "coder" {
		t.Errorf("expected first agent 'coder', got %q", agents[0].AgentName)
	}
	if agents[0].TotalExecutions != 3 {
		t.Errorf("expected 3 executions for coder, got %d", agents[0].TotalExecutions)
	}
	if agents[0].SuccessCount != 2 {
		t.Errorf("expected 2 successes for coder, got %d", agents[0].SuccessCount)
	}
}

func TestGetIssueStats(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()
	seedStatsDB(t, db)

	ss := NewStatsStore(db)
	stats, err := ss.GetIssueStats()
	if err != nil {
		t.Fatalf("GetIssueStats() error: %v", err)
	}

	if stats.OpenCount != 1 {
		t.Errorf("expected 1 open, got %d", stats.OpenCount)
	}
	if stats.ResolvedCount != 1 {
		t.Errorf("expected 1 resolved, got %d", stats.ResolvedCount)
	}
	if stats.AvgResolutionHours != 1.0 {
		t.Errorf("expected 1.0 hours avg resolution, got %f", stats.AvgResolutionHours)
	}
}

func TestGetVelocity(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()
	seedStatsDB(t, db)

	ss := NewStatsStore(db)
	velocity, err := ss.GetVelocity(30)
	if err != nil {
		t.Fatalf("GetVelocity() error: %v", err)
	}

	// We have 3 successful logs, all on the same day
	totalCount := 0
	for _, v := range velocity {
		totalCount += v.Count
	}
	if totalCount != 3 {
		t.Errorf("expected 3 total successful executions, got %d", totalCount)
	}
}

func TestGetOverviewStatsEmpty(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	ss := NewStatsStore(db)
	stats, err := ss.GetOverviewStats()
	if err != nil {
		t.Fatalf("GetOverviewStats() error: %v", err)
	}
	if stats.TotalProjects != 0 {
		t.Errorf("expected 0 projects, got %d", stats.TotalProjects)
	}
}
