package main

import (
	"net/http"

	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/registry"
	"github.com/conductor/fleet-commander/internal/sprintplanner"
)

func registerSprintSuggestRoutes(mux *http.ServeMux, projectManager *registry.ProjectManager) {
	mux.HandleFunc("POST /api/projects/{id}/sprints/suggest", func(w http.ResponseWriter, r *http.Request) {
		project, exists := projectManager.GetProject(r.PathValue("id"))
		if !exists {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		// Collect all pending tasks from the project
		var backlog []*models.Task
		for _, track := range project.Tracks {
			for _, phase := range track.Phases {
				for _, task := range phase.Tasks {
					if task.Status != models.StatusDone {
						backlog = append(backlog, task)
					}
				}
			}
		}

		if len(backlog) == 0 {
			writeJSON(w, http.StatusOK, map[string]string{"message": "No pending tasks in backlog"})
			return
		}

		// Use fallback suggestion (LLM integration can be wired in later)
		suggestion := sprintplanner.GenerateFallbackSuggestion(backlog, 10)
		writeJSON(w, http.StatusOK, suggestion)
	})
}
