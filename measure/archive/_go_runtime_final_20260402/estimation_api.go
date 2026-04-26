package main

import (
	"encoding/json"
	"net/http"

	"github.com/measure/fleet-commander/internal/estimation"
	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/registry"
)

func registerEstimationRoutes(mux *http.ServeMux, projectManager *registry.ProjectManager) {
	// Set estimate on a task
	mux.HandleFunc("PUT /api/projects/{id}/tasks/{tid}/estimate", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		taskID := r.PathValue("tid")
		task, found := findProjectTask(project, taskID)
		if !found {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Task not found"})
			return
		}

		var est models.Estimate
		if err := json.NewDecoder(r.Body).Decode(&est); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
			return
		}

		task.Estimate = &est
		projectManager.UpdateProject(project)

		writeJSON(w, http.StatusOK, task)
	})

	// Suggest an estimate for a task
	mux.HandleFunc("POST /api/projects/{id}/tasks/{tid}/estimate/suggest", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		taskID := r.PathValue("tid")
		task, found := findProjectTask(project, taskID)
		if !found {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Task not found"})
			return
		}

		result := estimation.SuggestEstimate(task)
		writeJSON(w, http.StatusOK, result)
	})

	// Get estimation accuracy stats
	mux.HandleFunc("GET /api/projects/{id}/estimation/stats", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		var allTasks []*models.Task
		for _, track := range project.Tracks {
			for _, phase := range track.Phases {
				allTasks = append(allTasks, phase.Tasks...)
			}
		}

		stats := estimation.ComputeAccuracy(allTasks)
		writeJSON(w, http.StatusOK, stats)
	})
}
