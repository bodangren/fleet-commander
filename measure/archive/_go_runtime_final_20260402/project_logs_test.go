package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/measure/fleet-commander/internal/logs"
	"github.com/measure/fleet-commander/internal/registry"
)

func TestHandleTaskReview_NoProject(t *testing.T) {
	pm := registry.NewProjectManager()
	logger := logs.NewLogger(t.TempDir(), "test-project")

	mux := http.NewServeMux()
	registerProjectLogRoutes(mux, pm, map[string]*logs.Logger{"test-project": logger}, nil)

	req := httptest.NewRequest("GET", "/api/projects/nonexistent/tasks/task-1/review", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rec.Code)
	}
}

func TestHandleTaskReview_NoLogger(t *testing.T) {
	pm := registry.NewProjectManager()
	projectDir := t.TempDir()
	pm.RegisterProject(projectDir)

	mux := http.NewServeMux()
	registerProjectLogRoutes(mux, pm, map[string]*logs.Logger{}, nil)

	req := httptest.NewRequest("GET", fmt.Sprintf("/api/projects/%s/tasks/task-1/review", filepath.Base(projectDir)), nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var resp ReviewResponse
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Status != "not_found" {
		t.Errorf("expected status 'not_found', got %q", resp.Status)
	}
}

func TestHandleTaskReview_WithReviewData(t *testing.T) {
	projectDir := t.TempDir()
	logsDir := t.TempDir()

	pm := registry.NewProjectManager()
	pm.RegisterProject(projectDir)
	projectID := filepath.Base(projectDir)

	// Create the project log subdirectory (logger expects {logsDir}/{projectID}/)
	projectLogDir := filepath.Join(logsDir, projectID)
	os.MkdirAll(projectLogDir, 0755)

	logger := logs.NewLogger(logsDir, projectID)

	// Write a review log entry
	reviewData := map[string]interface{}{
		"taskId": "task-1",
		"status": "reviewed",
		"results": []interface{}{
			map[string]interface{}{
				"category": "linter",
				"status":   "passed",
				"output":   "no issues",
			},
			map[string]interface{}{
				"category": "typecheck",
				"status":   "failed",
				"errors":   []interface{}{"undefined variable x"},
			},
		},
		"reviewedAt": time.Now().Format(time.RFC3339),
	}

	entry := logs.NewLogEntry(logs.TypeCompletion, projectID)
	entry.SetData(reviewData)
	if err := logger.Write(entry); err != nil {
		t.Fatalf("failed to write log entry: %v", err)
	}
	logger.Flush()

	// Verify ReadRecent returns entries
	entries, err := logger.ReadRecent(200)
	if err != nil {
		t.Fatalf("ReadRecent failed: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("expected at least one log entry from ReadRecent")
	}
	if entries[0].Type != logs.TypeCompletion {
		t.Errorf("expected TypeCompletion, got %s", entries[0].Type)
	}

	mux := http.NewServeMux()
	registerProjectLogRoutes(mux, pm, map[string]*logs.Logger{projectID: logger}, nil)

	req := httptest.NewRequest("GET", fmt.Sprintf("/api/projects/%s/tasks/task-1/review", projectID), nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var resp ReviewResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.TaskID != "task-1" {
		t.Errorf("expected taskId 'task-1', got %q", resp.TaskID)
	}

	if resp.Status != "failed" {
		t.Errorf("expected status 'failed', got %q", resp.Status)
	}

	if len(resp.Results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(resp.Results))
	}

	if resp.Results[0].Category != "linter" || resp.Results[0].Status != "passed" {
		t.Errorf("expected linter passed, got %s %s", resp.Results[0].Category, resp.Results[0].Status)
	}

	if resp.Results[1].Category != "typecheck" || resp.Results[1].Status != "failed" {
		t.Errorf("expected typecheck failed, got %s %s", resp.Results[1].Category, resp.Results[1].Status)
	}

	if len(resp.Results[1].Errors) != 1 || resp.Results[1].Errors[0] != "undefined variable x" {
		t.Errorf("expected error 'undefined variable x', got %v", resp.Results[1].Errors)
	}
}

func TestHandleTaskReview_PassingReview(t *testing.T) {
	projectDir := t.TempDir()
	logsDir := t.TempDir()

	pm := registry.NewProjectManager()
	pm.RegisterProject(projectDir)
	projectID := filepath.Base(projectDir)

	projectLogDir := filepath.Join(logsDir, projectID)
	os.MkdirAll(projectLogDir, 0755)

	logger := logs.NewLogger(logsDir, projectID)

	reviewData := map[string]interface{}{
		"taskId": "task-2",
		"status": "reviewed",
		"results": []interface{}{
			map[string]interface{}{
				"category": "linter",
				"status":   "passed",
			},
			map[string]interface{}{
				"category": "typecheck",
				"status":   "passed",
			},
		},
		"reviewedAt": time.Now().Format(time.RFC3339),
	}

	entry := logs.NewLogEntry(logs.TypeCompletion, projectID)
	entry.SetData(reviewData)
	logger.Write(entry)
	logger.Flush()

	mux := http.NewServeMux()
	registerProjectLogRoutes(mux, pm, map[string]*logs.Logger{projectID: logger}, nil)

	req := httptest.NewRequest("GET", fmt.Sprintf("/api/projects/%s/tasks/task-2/review", projectID), nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	var resp ReviewResponse
	json.NewDecoder(rec.Body).Decode(&resp)

	if resp.Status != "passed" {
		t.Errorf("expected status 'passed', got %q", resp.Status)
	}
}
