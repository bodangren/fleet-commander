package main

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/registry"
	"github.com/measure/fleet-commander/internal/store"
)

// sprintStoreCache holds sprint stores per project, lazily initialized.
type sprintStoreCache struct {
	mu     sync.RWMutex
	stores map[string]*store.SprintStore
}

func newSprintStoreCache() *sprintStoreCache {
	return &sprintStoreCache{stores: make(map[string]*store.SprintStore)}
}

func (c *sprintStoreCache) get(projectPath string) *store.SprintStore {
	c.mu.RLock()
	if s, ok := c.stores[projectPath]; ok {
		c.mu.RUnlock()
		return s
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()
	if s, ok := c.stores[projectPath]; ok {
		return s
	}
	s := store.NewSprintStore(projectPath)
	c.stores[projectPath] = s
	return s
}

func registerSprintRoutes(mux *http.ServeMux, projectManager *registry.ProjectManager) {
	cache := newSprintStoreCache()

	mux.HandleFunc("GET /api/projects/{id}/sprints", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}
		s := cache.get(project.Path)
		writeJSON(w, http.StatusOK, map[string]interface{}{"sprints": s.List()})
	})

	mux.HandleFunc("POST /api/projects/{id}/sprints", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		var sprint models.Sprint
		if err := json.NewDecoder(r.Body).Decode(&sprint); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
			return
		}

		s := cache.get(project.Path)
		if err := s.Create(&sprint); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}

		writeJSON(w, http.StatusCreated, sprint)
	})

	mux.HandleFunc("PUT /api/projects/{id}/sprints/{sid}", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		s := cache.get(project.Path)
		existing, ok := s.Get(r.PathValue("sid"))
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Sprint not found"})
			return
		}

		var update models.Sprint
		if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
			return
		}

		if update.Name != "" {
			existing.Name = update.Name
		}
		if update.Goal != "" {
			existing.Goal = update.Goal
		}
		if update.StartDate != "" {
			existing.StartDate = update.StartDate
		}
		if update.EndDate != "" {
			existing.EndDate = update.EndDate
		}
		if update.Status != "" {
			existing.Status = update.Status
		}

		if err := s.Update(existing); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, existing)
	})

	mux.HandleFunc("DELETE /api/projects/{id}/sprints/{sid}", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		s := cache.get(project.Path)
		if err := s.Delete(r.PathValue("sid")); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
	})

	mux.HandleFunc("POST /api/projects/{id}/sprints/{sid}/tasks", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		s := cache.get(project.Path)
		sprint, ok := s.Get(r.PathValue("sid"))
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Sprint not found"})
			return
		}

		var req struct {
			TaskIDs []string `json:"taskIds"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
			return
		}

		for _, taskID := range req.TaskIDs {
			sprint.AssignTask(taskID)
		}

		if err := s.Update(sprint); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, sprint)
	})

	mux.HandleFunc("DELETE /api/projects/{id}/sprints/{sid}/tasks/{tid}", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		s := cache.get(project.Path)
		sprint, ok := s.Get(r.PathValue("sid"))
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Sprint not found"})
			return
		}

		sprint.UnassignTask(r.PathValue("tid"))
		if err := s.Update(sprint); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, sprint)
	})

	// Burndown data
	mux.HandleFunc("GET /api/projects/{id}/sprints/{sid}/burndown", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		s := cache.get(project.Path)
		sprint, ok := s.Get(r.PathValue("sid"))
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Sprint not found"})
			return
		}

		// Count total and completed tasks
		totalTasks := len(sprint.TaskIDs)
		completedTasks := 0
		for _, taskID := range sprint.TaskIDs {
			task, found := findProjectTask(project, taskID)
			if found && task.Status == models.StatusDone {
				completedTasks++
			}
		}

		start, _ := time.Parse("2006-01-02", sprint.StartDate)
		end, _ := time.Parse("2006-01-02", sprint.EndDate)
		today := time.Now()
		if today.After(end) {
			today = end
		}

		type burndownPoint struct {
			Date      string `json:"date"`
			Remaining int    `json:"remaining"`
			Ideal     int    `json:"ideal"`
		}

		totalDays := int(end.Sub(start).Hours()/24) + 1
		if totalDays < 1 {
			totalDays = 1
		}
		elapsedDays := int(today.Sub(start).Hours()/24) + 1

		points := []burndownPoint{
			{
				Date:      today.Format("2006-01-02"),
				Remaining: totalTasks - completedTasks,
				Ideal:     totalTasks - (totalTasks * elapsedDays / totalDays),
			},
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"burndown":   points,
			"totalTasks": totalTasks,
			"completed":  completedTasks,
		})
	})
}
