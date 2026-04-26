package main

import (
	"encoding/json"
	"log"
	"net/http"
	"path/filepath"

	"github.com/measure/fleet-commander/internal/config"
	"github.com/measure/fleet-commander/internal/database"
	"github.com/measure/fleet-commander/internal/dispatcher"
	"github.com/measure/fleet-commander/internal/logs"
	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/orchestrator"
	"github.com/measure/fleet-commander/internal/parser"
	"github.com/measure/fleet-commander/internal/registry"
	"github.com/measure/fleet-commander/internal/scanner"
)

// ProjectDeps holds dependencies for project route handlers
type ProjectDeps struct {
	ProjectManager *registry.ProjectManager
	ProjectLoggers map[string]*logs.Logger
	ConfigManager  *config.ConfigManager
	Stores         *database.Stores
	Disp           *dispatcher.Dispatcher
	Orch           *orchestrator.Orchestrator
}

func handleListProjects(deps *ProjectDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projects := deps.ProjectManager.GetAllProjects()
		json.NewEncoder(w).Encode(projects)
	}
}

func handleGetProject(deps *ProjectDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		project, exists := deps.ProjectManager.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}

		json.NewEncoder(w).Encode(project)
	}
}

func handleRegisterProject(deps *ProjectDeps, watcherService WatcherInterface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var req struct {
			Path string `json:"path"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
			return
		}

		project, err := deps.ProjectManager.RegisterProject(req.Path)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		if watcherService != nil {
			if err := watcherService.WatchProject(project.ID); err != nil {
				log.Printf("Warning: Failed to watch project %s: %v", project.ID, err)
			}
		}

		if deps.ConfigManager != nil {
			_ = deps.ConfigManager.AddProject(config.ProjectEntry{ID: project.ID, Path: project.Path})
		}

		// Dual-write: persist project to SQLite
		if err := deps.Stores.Projects.Save(&database.Project{
			ID:   project.ID,
			Name: project.Name,
			Path: project.Path,
		}); err != nil {
			log.Printf("Warning: failed to dual-write project to SQLite: %v", err)
		}

		deps.ProjectLoggers[project.ID] = logs.NewLogger(filepath.Join(req.Path, "measure", "logs"), project.ID)

		json.NewEncoder(w).Encode(project)
	}
}

func handleScanProjects(deps *ProjectDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var req struct {
			RootDir string `json:"rootDir"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
			return
		}
		if req.RootDir == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "rootDir is required"})
			return
		}

		paths := scanner.FindConductorProjects(req.RootDir)
		if paths == nil {
			paths = []string{}
		}
		json.NewEncoder(w).Encode(map[string][]string{"paths": paths})
	}
}

func handleScanAndImportProjects(deps *ProjectDeps, watcherService WatcherInterface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var req struct {
			RootDir string `json:"rootDir"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
			return
		}
		if req.RootDir == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "rootDir is required"})
			return
		}

		paths := scanner.FindConductorProjects(req.RootDir)
		if paths == nil {
			paths = []string{}
		}

		var projects []*models.Project
		var configEntries []config.ProjectEntry
		for _, path := range paths {
			p, err := deps.ProjectManager.RegisterProject(path)
			if err != nil {
				log.Printf("Warning: Failed to register project %s: %v", path, err)
				continue
			}
			if watcherService != nil {
				if err := watcherService.WatchProject(p.ID); err != nil {
					log.Printf("Warning: Failed to watch project %s: %v", p.ID, err)
				}
			}
			projects = append(projects, p)
			configEntries = append(configEntries, config.ProjectEntry{ID: p.ID, Path: p.Path})
			deps.ProjectLoggers[p.ID] = logs.NewLogger(filepath.Join(path, "measure", "logs"), p.ID)
			loadProjectTracks(deps.ProjectManager, p)
		}

		if deps.ConfigManager != nil && len(configEntries) > 0 {
			_ = deps.ConfigManager.AddProjects(configEntries)
		}

		if projects == nil {
			projects = []*models.Project{}
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"registered": projects,
			"discovered": len(paths),
		})
	}
}

func handleBulkRegisterProjects(deps *ProjectDeps, watcherService WatcherInterface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var req struct {
			Paths []string `json:"paths"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
			return
		}

		var projects []*models.Project
		var configEntries []config.ProjectEntry
		for _, path := range req.Paths {
			p, err := deps.ProjectManager.RegisterProject(path)
			if err != nil {
				log.Printf("Warning: Failed to register project %s: %v", path, err)
				continue
			}
			if watcherService != nil {
				if err := watcherService.WatchProject(p.ID); err != nil {
					log.Printf("Warning: Failed to watch project %s: %v", p.ID, err)
				}
			}
			projects = append(projects, p)
			configEntries = append(configEntries, config.ProjectEntry{ID: p.ID, Path: p.Path})
			deps.ProjectLoggers[p.ID] = logs.NewLogger(filepath.Join(path, "measure", "logs"), p.ID)
		}

		if deps.ConfigManager != nil && len(configEntries) > 0 {
			_ = deps.ConfigManager.AddProjects(configEntries)
		}

		if projects == nil {
			projects = []*models.Project{}
		}
		json.NewEncoder(w).Encode(projects)
	}
}

func handleGetNextTask(deps *ProjectDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		_, exists := deps.ProjectManager.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}

		scored, err := deps.Disp.GetNext(projectID)
		if err != nil {
			log.Printf("dispatcher error: %v", err)
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
	}
}

func handleGetCandidates(deps *ProjectDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		_, exists := deps.ProjectManager.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}

		candidates, err := deps.Disp.GetCandidates(projectID)
		if err != nil {
			log.Printf("dispatcher error: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"candidates": candidates,
		})
	}
}

func handleRunProject(deps *ProjectDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		go func() {
			if err := deps.Orch.Run(projectID); err != nil {
				log.Printf("Orchestrator run error for project %s: %v", projectID, err)
			}
		}()

		json.NewEncoder(w).Encode(map[string]string{"status": "started"})
	}
}

func handleUpdateTask(deps *ProjectDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")
		taskID := r.PathValue("taskId")

		var req struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
			return
		}

		project, exists := deps.ProjectManager.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}

		var foundTask *models.Task
		var foundTrack *models.Track
		for _, track := range project.Tracks {
			for _, phase := range track.Phases {
				for _, t := range phase.Tasks {
					if t.ID == taskID {
						foundTask = t
						foundTrack = track
						break
					}
				}
				if foundTask != nil {
					break
				}
			}
			if foundTask != nil {
				break
			}
		}

		if foundTask == nil {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Task not found"})
			return
		}

		var newStatus models.Status
		switch req.Status {
		case "done":
			newStatus = models.StatusDone
		case "active":
			newStatus = models.StatusActive
		case "blocked":
			newStatus = models.StatusBlocked
		default:
			newStatus = models.StatusTodo
		}

		foundTask.Status = newStatus
		deps.ProjectManager.UpdateProject(project)

		// Auto-unblock dependents when a task is marked done
		if newStatus == models.StatusDone {
			unblocked := orchestrator.AutoUnblockDependents(project, taskID)
			if len(unblocked) > 0 {
				log.Printf("Auto-unblocked tasks: %v", unblocked)
				// Persist unblocked tasks to plan.md
				for _, track := range project.Tracks {
					for _, phase := range track.Phases {
						for _, t := range phase.Tasks {
							if t.Status == models.StatusTodo && contains(unblocked, t.ID) {
								if track.PlanPath != "" {
									planPath := parser.ResolvePlanPath(project.Path, track.PlanPath)
									if err := parser.WritePlanStatusByID(planPath, t.ID, models.StatusTodo); err != nil {
										log.Printf("Warning: failed to persist unblocked task status: %v", err)
									}
								}
							}
						}
					}
				}
			}
		}

		// Persist to plan.md if we have a track with a plan path
		if foundTrack != nil && foundTrack.PlanPath != "" {
			planPath := parser.ResolvePlanPath(project.Path, foundTrack.PlanPath)
			if err := parser.WritePlanStatusByID(planPath, foundTask.ID, newStatus); err != nil {
				log.Printf("Warning: failed to persist task status: %v", err)
			}
		}

		// Dual-write: persist to SQLite
		if err := deps.Stores.Tasks.Save(&database.Task{
			ID:          foundTask.ID,
			TrackID:     foundTrack.ID,
			Phase:       foundTask.Phase,
			Description: foundTask.Description,
			Status:      string(newStatus),
			AgentTag:    foundTask.AgentTag,
		}); err != nil {
			log.Printf("Warning: failed to dual-write task to SQLite: %v", err)
		}

		json.NewEncoder(w).Encode(foundTask)
	}
}

// WatcherInterface abstracts the watcher service for project route handlers
type WatcherInterface interface {
	WatchProject(projectID string) error
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
