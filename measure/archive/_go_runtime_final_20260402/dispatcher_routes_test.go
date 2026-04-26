package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/measure/fleet-commander/internal/dispatcher"
	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/registry"
)

func setupDispatcherTestMux(t *testing.T) (*http.ServeMux, *registry.ProjectManager, *models.Project) {
	t.Helper()
	projectManager := registry.NewProjectManager()
	projectDir := t.TempDir()
	project, err := projectManager.RegisterProject(projectDir)
	if err != nil {
		t.Fatalf("failed to register project: %v", err)
	}
	project.Tracks = []*models.Track{
		{
			ID:       "track-1",
			Name:     "Test Track",
			PlanPath: "./plan.md",
			Phases: []*models.Phase{
				{
					Name: "Phase 1",
					Tasks: []*models.Task{
						{ID: "task-1", Description: "First task", Status: models.StatusTodo, Phase: "Phase 1"},
						{ID: "task-2", Description: "priority:high Second task", Status: models.StatusTodo, Phase: "Phase 1"},
						{ID: "task-3", Description: "Done task", Status: models.StatusDone, Phase: "Phase 1"},
					},
				},
			},
		},
	}
	projectManager.UpdateProject(project)

	extractor := dispatcher.NewProjectExtractor(projectManager)
	agg := dispatcher.NewTaskAggregator(extractor)
	scorer := &dispatcher.PriorityScorer{}
	disp := dispatcher.NewDispatcher(agg, scorer)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/projects/{id}/next-task", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")
		_, exists := projectManager.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}
		scored, err := disp.GetNext(projectID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		if scored == nil {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"message": "no tasks available"})
			return
		}
		json.NewEncoder(w).Encode(scored)
	})

	mux.HandleFunc("GET /api/projects/{id}/candidates", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")
		_, exists := projectManager.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}
		candidates, err := disp.GetCandidates(projectID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"candidates": candidates,
		})
	})

	return mux, projectManager, project
}

func TestDispatcherNextTaskReturnsScoredCandidate(t *testing.T) {
	mux, _, project := setupDispatcherTestMux(t)

	req := httptest.NewRequest(http.MethodGet, "/api/projects/"+project.ID+"/next-task", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}

	var result dispatcher.ScoredCandidate
	if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if result.Score <= 0 {
		t.Fatalf("expected positive score, got %f", result.Score)
	}
	if result.ID == "" {
		t.Fatal("expected candidate ID to be set")
	}
	if result.Rationale == "" {
		t.Fatal("expected rationale to be set")
	}
}

func TestDispatcherNextTaskReturns404ForUnknownProject(t *testing.T) {
	mux, _, _ := setupDispatcherTestMux(t)

	req := httptest.NewRequest(http.MethodGet, "/api/projects/nonexistent/next-task", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestDispatcherCandidatesReturnsScored(t *testing.T) {
	mux, _, project := setupDispatcherTestMux(t)

	req := httptest.NewRequest(http.MethodGet, "/api/projects/"+project.ID+"/candidates", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}

	var payload map[string][]dispatcher.ScoredCandidate
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	candidates := payload["candidates"]
	if len(candidates) != 2 {
		t.Fatalf("expected 2 todo candidates, got %d", len(candidates))
	}

	// High priority task should be ranked first
	if candidates[0].Rationale == "" {
		t.Fatal("expected rationale on first candidate")
	}
}

func TestDispatcherCandidatesReturns404ForUnknownProject(t *testing.T) {
	mux, _, _ := setupDispatcherTestMux(t)

	req := httptest.NewRequest(http.MethodGet, "/api/projects/nonexistent/candidates", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestDispatcherScorerConfiguration(t *testing.T) {
	projectManager := registry.NewProjectManager()
	projectDir := t.TempDir()
	project, err := projectManager.RegisterProject(projectDir)
	if err != nil {
		t.Fatalf("failed to register project: %v", err)
	}
	project.Tracks = []*models.Track{
		{
			ID:       "track-1",
			Name:     "Test Track",
			PlanPath: "./plan.md",
			Phases: []*models.Phase{
				{
					Name: "Phase 1",
					Tasks: []*models.Task{
						{ID: "task-1", Description: "First task", Status: models.StatusTodo, Phase: "Phase 1"},
					},
				},
			},
		},
	}
	projectManager.UpdateProject(project)

	extractor := dispatcher.NewProjectExtractor(projectManager)
	agg := dispatcher.NewTaskAggregator(extractor)

	// Both priority and llm (without client) should use PriorityScorer
	for _, mode := range []string{"priority", "llm", ""} {
		var scorer dispatcher.Scorer
		switch mode {
		case "llm":
			scorer = &dispatcher.PriorityScorer{}
		default:
			scorer = &dispatcher.PriorityScorer{}
		}
		disp := dispatcher.NewDispatcher(agg, scorer)
		result, err := disp.GetNext(project.ID)
		if err != nil {
			t.Fatalf("mode=%q: GetNext returned error: %v", mode, err)
		}
		if result == nil {
			t.Fatalf("mode=%q: expected a candidate", mode)
		}
		if result.Score <= 0 {
			t.Fatalf("mode=%q: expected positive score, got %f", mode, result.Score)
		}
	}
}
