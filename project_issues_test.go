package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/registry"
)

func TestHandleGetProjectIssueReturnsMatchingMarkdown(t *testing.T) {
	projectDir := t.TempDir()
	issueDir := filepath.Join(projectDir, "conductor", "broker", "open")
	if err := os.MkdirAll(issueDir, 0755); err != nil {
		t.Fatalf("failed to create issue dir: %v", err)
	}

	issuePath := filepath.Join(issueDir, "issue-123-api-error.md")
	if err := os.WriteFile(issuePath, []byte("# Blocker\n\nTask: phase-1-2\n"), 0644); err != nil {
		t.Fatalf("failed to write issue file: %v", err)
	}

	projectManager := registry.NewProjectManager()
	project, err := projectManager.RegisterProject(projectDir)
	if err != nil {
		t.Fatalf("failed to register project: %v", err)
	}
	project.Tracks = []*models.Track{
		{
			ID:       "track-1",
			Name:     "Frontend - Project Kanban Board",
			PlanPath: "./tracks/frontend_project_kanban_board_20260325/",
			Phases: []*models.Phase{
				{
					Name: "Phase 1: Project Detail View & Data Fetching",
					Tasks: []*models.Task{
						{
							ID:          "phase-1-2",
							Description: "Fetch full project details from the Go API.",
							Status:      models.StatusBlocked,
							Phase:       "Phase 1: Project Detail View & Data Fetching",
						},
					},
				},
			},
		},
	}
	projectManager.UpdateProject(project)

	mux := http.NewServeMux()
	registerProjectIssueRoutes(mux, projectManager)

	req := httptest.NewRequest(http.MethodGet, "/api/projects/"+project.ID+"/issues/phase-1-2", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d body=%s", rec.Code, rec.Body.String())
	}

	var payload issuePreview
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode issue response: %v", err)
	}
	if payload.FileName != "issue-123-api-error.md" {
		t.Fatalf("unexpected issue file name: %s", payload.FileName)
	}
	if payload.Content == "" {
		t.Fatal("expected issue content to be populated")
	}
}

func TestHandleGetProjectIssueRejectsNonBlockedTask(t *testing.T) {
	projectDir := t.TempDir()
	projectManager := registry.NewProjectManager()
	project, err := projectManager.RegisterProject(projectDir)
	if err != nil {
		t.Fatalf("failed to register project: %v", err)
	}
	project.Tracks = []*models.Track{
		{
			ID:   "track-1",
			Name: "Track",
			Phases: []*models.Phase{
				{
					Name: "Phase 1",
					Tasks: []*models.Task{
						{
							ID:          "phase-1-1",
							Description: "Task that is not blocked",
							Status:      models.StatusTodo,
							Phase:       "Phase 1",
						},
					},
				},
			},
		},
	}
	projectManager.UpdateProject(project)

	mux := http.NewServeMux()
	registerProjectIssueRoutes(mux, projectManager)

	req := httptest.NewRequest(http.MethodGet, "/api/projects/"+project.ID+"/issues/phase-1-1", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected bad request for non-blocked task, got %d body=%s", rec.Code, rec.Body.String())
	}
}
