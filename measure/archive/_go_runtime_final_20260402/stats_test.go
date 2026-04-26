package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/measure/fleet-commander/internal/database"
)

func setupStatsServer(t *testing.T) (*http.ServeMux, *database.Stores) {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	db, err := database.New(dbPath)
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	stores := database.NewStores(db)

	// Seed data
	stores.Projects.Save(&database.Project{ID: "p1", Name: "Test", Path: "/tmp/test"})
	db.Exec(`INSERT INTO tracks (id, project_id, name, type, status) VALUES ('t1', 'p1', 'Track1', 'feature', 'active')`)
	stores.Tasks.Save(&database.Task{ID: "task1", TrackID: "t1", Phase: "Phase 1", Description: "Do thing", Status: "done"})
	stores.Issues.Save(&database.Issue{ID: "iss1", ProjectID: "p1", Title: "Bug", Type: "blocker", Status: "open", CreatedAt: 1000})
	stores.ExecutionLogs.Save(&database.ExecutionLog{ID: "log1", ProjectID: "p1", AgentName: "coder", Status: "success", DurationMs: 5000, Timestamp: 1000})

	mux := http.NewServeMux()
	registerStatsRoutes(mux, stores)
	return mux, stores
}

func TestStatsOverviewEndpoint(t *testing.T) {
	mux, _ := setupStatsServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/stats/overview", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var stats database.OverviewStats
	json.Unmarshal(rec.Body.Bytes(), &stats)
	if stats.TotalProjects != 1 {
		t.Errorf("expected 1 project, got %d", stats.TotalProjects)
	}
	if stats.CompletedTasks != 1 {
		t.Errorf("expected 1 completed task, got %d", stats.CompletedTasks)
	}
}

func TestStatsAgentsEndpoint(t *testing.T) {
	mux, _ := setupStatsServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/stats/agents", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string][]database.AgentStats
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if len(resp["agents"]) != 1 {
		t.Errorf("expected 1 agent, got %d", len(resp["agents"]))
	}
}

func TestStatsIssuesEndpoint(t *testing.T) {
	mux, _ := setupStatsServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/stats/issues", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var stats database.IssueStats
	json.Unmarshal(rec.Body.Bytes(), &stats)
	if stats.OpenCount != 1 {
		t.Errorf("expected 1 open issue, got %d", stats.OpenCount)
	}
}

func TestStatsVelocityEndpoint(t *testing.T) {
	mux, _ := setupStatsServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/stats/velocity?days=90", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}
