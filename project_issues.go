package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/conductor/fleet-commander/internal/issues"
	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/registry"
)

type issuePreview struct {
	FileName    string `json:"fileName"`
	Path        string `json:"path"`
	Content     string `json:"content"`
	MatchReason string `json:"matchReason"`
}

func registerProjectIssueRoutes(mux *http.ServeMux, projectManager *registry.ProjectManager) {
	mux.HandleFunc("GET /api/projects/{id}/issues", func(w http.ResponseWriter, r *http.Request) {
		handleListProjectIssues(w, r, projectManager)
	})

	mux.HandleFunc("POST /api/projects/{id}/issues", func(w http.ResponseWriter, r *http.Request) {
		handleCreateProjectIssue(w, r, projectManager)
	})

	mux.HandleFunc("GET /api/projects/{id}/issues/{taskId}", func(w http.ResponseWriter, r *http.Request) {
		handleGetProjectIssue(w, r, projectManager)
	})

	mux.HandleFunc("PATCH /api/projects/{id}/issues/{issueId}", func(w http.ResponseWriter, r *http.Request) {
		handleUpdateProjectIssue(w, r, projectManager)
	})
}

func handleGetProjectIssue(w http.ResponseWriter, r *http.Request, projectManager *registry.ProjectManager) {
	projectID := r.PathValue("id")
	taskID := r.PathValue("taskId")

	project, exists := projectManager.GetProject(projectID)
	if !exists {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
		return
	}

	task, found := findProjectTask(project, taskID)
	if !found {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Task not found"})
		return
	}

	if task.Status != models.StatusBlocked {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Issue previews are only available for blocked tasks"})
		return
	}

	preview, err := findMatchingIssuePreview(project.Path, task)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if preview == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "No open issue matched the blocked task"})
		return
	}

	writeJSON(w, http.StatusOK, preview)
}

func findProjectTask(project *models.Project, taskID string) (*models.Task, bool) {
	for _, track := range project.Tracks {
		for _, phase := range track.Phases {
			for _, task := range phase.Tasks {
				if task.ID == taskID {
					return task, true
				}
			}
		}
	}
	return nil, false
}

func findMatchingIssuePreview(projectPath string, task *models.Task) (*issuePreview, error) {
	issueDir := filepath.Join(projectPath, "conductor", "broker", "open")
	entries, err := os.ReadDir(issueDir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to read issue directory: %w", err)
	}

	type candidate struct {
		issuePreview
		score int
	}

	var candidates []candidate
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".md") {
			continue
		}

		path := filepath.Join(issueDir, entry.Name())
		content, err := os.ReadFile(path)
		if err != nil {
			continue
		}

		score, reason := scoreIssueMatch(entry.Name(), string(content), task)
		candidates = append(candidates, candidate{
			issuePreview: issuePreview{
				FileName:    entry.Name(),
				Path:        path,
				Content:     string(content),
				MatchReason: reason,
			},
			score: score,
		})
	}

	if len(candidates) == 0 {
		return nil, nil
	}

	best := candidates[0]
	for _, candidate := range candidates[1:] {
		if candidate.score > best.score {
			best = candidate
		}
	}

	if best.score == 0 && len(candidates) > 1 {
		return nil, nil
	}

	if best.score == 0 && len(candidates) == 1 {
		best.MatchReason = "only open issue available"
	}

	return &best.issuePreview, nil
}

func scoreIssueMatch(fileName, content string, task *models.Task) (int, string) {
	contentLower := strings.ToLower(content)
	fileLower := strings.ToLower(fileName)

	score := 0
	reasons := make([]string, 0, 4)

	if task.ID != "" {
		taskID := strings.ToLower(task.ID)
		if strings.Contains(fileLower, taskID) {
			score += 120
			reasons = append(reasons, "filename matches task id")
		}
		if strings.Contains(contentLower, taskID) {
			score += 100
			reasons = append(reasons, "content matches task id")
		}
	}

	if task.Description != "" {
		description := strings.ToLower(task.Description)
		if strings.Contains(contentLower, description) {
			score += 90
			reasons = append(reasons, "content matches task description")
		}
		score += sharedTokenScore(description, contentLower)
		score += sharedTokenScore(description, fileLower)
	}

	if task.Phase != "" {
		phase := strings.ToLower(task.Phase)
		if strings.Contains(contentLower, phase) {
			score += 60
			reasons = append(reasons, "content matches phase")
		}
		score += sharedTokenScore(phase, contentLower)
		score += sharedTokenScore(phase, fileLower)
	}

	if task.AgentTag != "" {
		agentTag := "@" + strings.ToLower(task.AgentTag)
		if strings.Contains(contentLower, agentTag) {
			score += 40
			reasons = append(reasons, "content matches agent tag")
		}
		if strings.Contains(fileLower, task.AgentTag) {
			score += 20
			reasons = append(reasons, "filename matches agent tag")
		}
	}

	return score, strings.Join(reasons, "; ")
}

func sharedTokenScore(source, target string) int {
	score := 0
	tokens := map[string]struct{}{}
	for _, token := range strings.FieldsFunc(source, func(r rune) bool {
		return !((r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'))
	}) {
		token = strings.TrimSpace(token)
		if len(token) < 4 {
			continue
		}
		if _, seen := tokens[token]; seen {
			continue
		}
		tokens[token] = struct{}{}
		if strings.Contains(target, token) {
			score += 8
		}
	}
	return score
}

func handleListProjectIssues(w http.ResponseWriter, r *http.Request, projectManager *registry.ProjectManager) {
	projectID := r.PathValue("id")
	project, exists := projectManager.GetProject(projectID)
	if !exists {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
		return
	}

	issueDir := filepath.Join(project.Path, "conductor", "broker", "open")
	store := issues.NewStore(issueDir)

	statusFilter := r.URL.Query().Get("status")
	var issueList []issues.Issue
	var err error

	if statusFilter != "" {
		issueList, err = store.ListByStatus(issues.IssueStatus(statusFilter))
	} else {
		issueList, err = store.List()
	}

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"issues": issueList})
}

type createIssueRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Type        string `json:"type"`
	RelatedTask string `json:"relatedTask"`
}

func handleCreateProjectIssue(w http.ResponseWriter, r *http.Request, projectManager *registry.ProjectManager) {
	projectID := r.PathValue("id")
	project, exists := projectManager.GetProject(projectID)
	if !exists {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
		return
	}

	var req createIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	if req.Title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title is required"})
		return
	}

	issueType := issues.TypeBlocker
	if req.Type != "" {
		issueType = issues.IssueType(req.Type)
	}

	issue := &issues.Issue{
		ID:          issues.GenerateIssueID(issueType),
		Title:       req.Title,
		Description: req.Description,
		Type:        issueType,
		Status:      issues.StatusOpen,
		CreatedAt:   time.Now(),
		ProjectID:   projectID,
		RelatedTask: req.RelatedTask,
	}

	issueDir := filepath.Join(project.Path, "conductor", "broker", "open")
	store := issues.NewStore(issueDir)

	if err := store.Save(issue); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, issue)
}

type updateIssueRequest struct {
	Status string `json:"status"`
}

func handleUpdateProjectIssue(w http.ResponseWriter, r *http.Request, projectManager *registry.ProjectManager) {
	projectID := r.PathValue("id")
	issueID := r.PathValue("issueId")

	project, exists := projectManager.GetProject(projectID)
	if !exists {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
		return
	}

	var req updateIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	issueDir := filepath.Join(project.Path, "conductor", "broker", "open")
	store := issues.NewStore(issueDir)

	issue, err := store.Get(issueID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if issue == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Issue not found"})
		return
	}

	if req.Status != "" {
		issue.SetStatus(issues.IssueStatus(req.Status))
		if err := store.Save(issue); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
	}

	writeJSON(w, http.StatusOK, issue)
}
