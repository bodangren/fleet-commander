package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/conductor/fleet-commander/internal/config"
	"github.com/conductor/fleet-commander/internal/dispatcher"
	"github.com/conductor/fleet-commander/internal/executor"
	"github.com/conductor/fleet-commander/internal/hub"
	"github.com/conductor/fleet-commander/internal/logs"
	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/orchestrator"
	"github.com/conductor/fleet-commander/internal/parser"
	"github.com/conductor/fleet-commander/internal/registry"
	"github.com/conductor/fleet-commander/internal/scanner"
	"github.com/conductor/fleet-commander/internal/watcher"
)

type HealthResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

type ExecuteTaskRequest struct {
	TaskID string `json:"taskId"`
	Agent  string `json:"agent"`
}

func main() {
	projectManager := registry.NewProjectManager()
	projectLoggers := make(map[string]*logs.Logger)

	watcherService, err := watcher.NewWatcherService(projectManager)
	if err != nil {
		log.Fatalf("Failed to create watcher service: %v", err)
	}
	defer watcherService.Close()

	// Load persisted projects from ~/.conductor/projects.json
	configManager, err := config.NewConfigManager()
	if err != nil {
		log.Printf("Warning: Failed to create config manager: %v", err)
	} else {
		entries, err := configManager.Load()
		if err != nil {
			log.Printf("Warning: Failed to load projects.json: %v", err)
		} else {
			for _, entry := range entries {
				p, err := projectManager.RegisterProject(entry.Path)
				if err != nil {
					log.Printf("Warning: Failed to register project %s: %v", entry.Path, err)
					continue
				}
				if err := watcherService.WatchProject(p.ID); err != nil {
					log.Printf("Warning: Failed to watch project %s: %v", p.ID, err)
				}
				projectLoggers[p.ID] = logs.NewLogger(filepath.Join(entry.Path, "conductor", "logs"), p.ID)
			}
		}
	}

	currentDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get current directory: %v", err)
	}

	project, err := projectManager.RegisterProject(currentDir)
	if err != nil {
		log.Fatalf("Failed to register current project: %v", err)
	}

	err = watcherService.WatchProject(project.ID)
	if err != nil {
		log.Printf("Warning: Failed to watch conductor directory: %v", err)
	}

	watcherService.Start()

	wsHub := hub.New()
	management := newManagementAPI(currentDir)

	agentStore := management.defaultAgentStore()
	harnessStore := management.defaultHarnessStore()
	executionService := executor.NewExecutionService(wsHub, agentStore, harnessStore)

	logsDir := filepath.Join(currentDir, "conductor", "logs")
	projectLogger := logs.NewLogger(logsDir, project.ID)
	projectLoggers[project.ID] = projectLogger

	orch := orchestrator.New(projectManager, orchestrator.WithExecutor(executionService), orchestrator.WithLogger(projectLogger))

	// Initialize dispatcher with PriorityScorer (LLM scorer available when client is configured)
	extractor := dispatcher.NewProjectExtractor(projectManager)
	agg := dispatcher.NewTaskAggregator(extractor)
	scorer := &dispatcher.PriorityScorer{}
	disp := dispatcher.NewDispatcher(agg, scorer)

	mux := http.NewServeMux()
	management.register(mux)

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(HealthResponse{
			Status:  "ok",
			Message: "Conductor Fleet Commander Daemon is running.",
		})
	})

	mux.HandleFunc("GET /api/projects", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projects := projectManager.GetAllProjects()
		json.NewEncoder(w).Encode(projects)
	})

	mux.HandleFunc("GET /api/projects/{id}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		project, exists := projectManager.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}

		json.NewEncoder(w).Encode(project)
	})

	mux.HandleFunc("POST /api/projects/register", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var req struct {
			Path string `json:"path"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
			return
		}

		project, err := projectManager.RegisterProject(req.Path)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		err = watcherService.WatchProject(project.ID)
		if err != nil {
			log.Printf("Warning: Failed to watch conductor directory: %v", err)
		}

		if configManager != nil {
			_ = configManager.AddProject(config.ProjectEntry{ID: project.ID, Path: project.Path})
		}

		projectLoggers[project.ID] = logs.NewLogger(filepath.Join(req.Path, "conductor", "logs"), project.ID)

		json.NewEncoder(w).Encode(project)
	})

	// POST /api/projects/scan - scan for conductor projects under rootDir
	mux.HandleFunc("POST /api/projects/scan", func(w http.ResponseWriter, r *http.Request) {
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
	})

	// POST /api/projects - register multiple projects by path
	mux.HandleFunc("POST /api/projects", func(w http.ResponseWriter, r *http.Request) {
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
			p, err := projectManager.RegisterProject(path)
			if err != nil {
				log.Printf("Warning: Failed to register project %s: %v", path, err)
				continue
			}
			if err := watcherService.WatchProject(p.ID); err != nil {
				log.Printf("Warning: Failed to watch project %s: %v", p.ID, err)
			}
			projects = append(projects, p)
			configEntries = append(configEntries, config.ProjectEntry{ID: p.ID, Path: p.Path})
			projectLoggers[p.ID] = logs.NewLogger(filepath.Join(path, "conductor", "logs"), p.ID)
		}

		if configManager != nil && len(configEntries) > 0 {
			_ = configManager.AddProjects(configEntries)
		}

		if projects == nil {
			projects = []*models.Project{}
		}
		json.NewEncoder(w).Encode(projects)
	})

	// GET /api/projects/:id/next-task - return top-ranked task from dispatcher
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
	})

	// GET /api/projects/:id/candidates - return all scored/ranked candidates
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
			log.Printf("dispatcher error: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"candidates": candidates,
		})
	})

	// POST /api/projects/:id/run - trigger orchestrator run
	mux.HandleFunc("POST /api/projects/{id}/run", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		go func() {
			if err := orch.Run(projectID); err != nil {
				log.Printf("Orchestrator run error for project %s: %v", projectID, err)
			}
		}()

		json.NewEncoder(w).Encode(map[string]string{"status": "started"})
	})

	// PATCH /api/projects/:id/tasks/:taskId - update task status
	mux.HandleFunc("PATCH /api/projects/{id}/tasks/{taskId}", func(w http.ResponseWriter, r *http.Request) {
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

		project, exists := projectManager.GetProject(projectID)
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
		projectManager.UpdateProject(project)

		// Persist to plan.md if we have a track with a plan path
		if foundTrack != nil && foundTrack.PlanPath != "" {
			planPath := parser.ResolvePlanPath(project.Path, foundTrack.PlanPath)
			if err := parser.WritePlanStatusByID(planPath, foundTask.ID, newStatus); err != nil {
				log.Printf("Warning: failed to persist task status: %v", err)
			}
		}

		json.NewEncoder(w).Encode(foundTask)
	})

	registerProjectIssueRoutes(mux, projectManager)

	registerProjectLogRoutes(mux, projectManager, projectLoggers)

	mux.HandleFunc("POST /api/projects/{id}/tasks/execute", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		var req ExecuteTaskRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
			return
		}

		project, exists := projectManager.GetProject(projectID)
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
			return
		}

		var task *models.Task
		for _, track := range project.Tracks {
			for _, phase := range track.Phases {
				for _, t := range phase.Tasks {
					if t.ID == req.TaskID {
						task = t
						break
					}
				}
				if task != nil {
					break
				}
			}
			if task != nil {
				break
			}
		}

		if task == nil {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Task not found"})
			return
		}

		if err := executionService.ExecuteTask(projectID, task.ID, task.Description, "", "", task.AgentTag); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"status": "started"})
	})

	mux.HandleFunc("POST /api/projects/{id}/tasks/stop", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		if err := executionService.StopExecution(projectID); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"status": "stopped"})
	})

	mux.HandleFunc("/ws/output", executionService.BroadcastOutput)

	// GET /api/projects/:id/ws - WebSocket connection for streaming project output
	mux.HandleFunc("GET /api/projects/{id}/ws", func(w http.ResponseWriter, r *http.Request) {
		projectID := r.PathValue("id")
		wsHub.ServeWS(projectID, w, r)
	})

	frontendDir := filepath.Join(".", "frontend", "dist")
	fs := http.FileServer(http.Dir(frontendDir))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(frontendDir, r.URL.Path)
		_, err := os.Stat(path)
		if os.IsNotExist(err) || r.URL.Path == "/" {
			http.ServeFile(w, r, filepath.Join(frontendDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})

	port := "8081"
	log.Printf("Starting Conductor Fleet Commander on http://localhost:%s\n", port)
	log.Printf("Monitoring project: %s\n", currentDir)

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
