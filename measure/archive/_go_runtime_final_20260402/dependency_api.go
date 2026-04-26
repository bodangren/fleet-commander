package main

import (
	"encoding/json"
	"net/http"

	"github.com/measure/fleet-commander/internal/dependency"
	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/registry"
)

func registerDependencyRoutes(mux *http.ServeMux, pm *registry.ProjectManager) {
	// GET /api/projects/:id/dependencies - return dependency graph as JSON
	mux.HandleFunc("GET /api/projects/{id}/dependencies", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		project, exists := pm.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}

		tasks := collectAllTasks(project)
		graph := dependency.BuildGraph(tasks)

		json.NewEncoder(w).Encode(graph)
	})

	// GET /api/projects/:id/critical-path - return critical path task IDs
	mux.HandleFunc("GET /api/projects/{id}/critical-path", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		project, exists := pm.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}

		tasks := collectAllTasks(project)
		graph := dependency.BuildGraph(tasks)

		cp := graph.CriticalPath()
		if cp == nil {
			cp = []string{}
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"criticalPath": cp,
			"hasCycle":     graph.HasCycle(),
		})
	})

	// GET /api/projects/:id/blocked-tasks - return blocked task IDs
	mux.HandleFunc("GET /api/projects/{id}/blocked-tasks", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		project, exists := pm.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}

		tasks := collectAllTasks(project)
		graph := dependency.BuildGraph(tasks)

		blocked := graph.GetBlockedTasks()
		if blocked == nil {
			blocked = []string{}
		}

		json.NewEncoder(w).Encode(map[string][]string{"blocked": blocked})
	})

	// POST /api/projects/:id/dependencies/validate - validate a proposed dependency
	mux.HandleFunc("POST /api/projects/{id}/dependencies/validate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		project, exists := pm.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}

		var req struct {
			From string `json:"from"`
			To   string `json:"to"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
			return
		}

		tasks := collectAllTasks(project)
		graph := dependency.BuildGraph(tasks)

		if err := graph.ValidateNewDependency(req.From, req.To); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"status": "valid"})
	})
}

// collectAllTasks gathers tasks from all tracks and phases in a project.
func collectAllTasks(project *models.Project) []*models.Task {
	var tasks []*models.Task
	for _, track := range project.Tracks {
		for _, phase := range track.Phases {
			tasks = append(tasks, phase.Tasks...)
		}
	}
	return tasks
}
