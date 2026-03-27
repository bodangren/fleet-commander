package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/conductor/fleet-commander/internal/executor"
	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/registry"
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

	watcherService, err := watcher.NewWatcherService(projectManager)
	if err != nil {
		log.Fatalf("Failed to create watcher service: %v", err)
	}
	defer watcherService.Close()

	executionService := executor.NewExecutionService()
	executionService.LoadDefaultAgentConfigs()

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

	mux := http.NewServeMux()

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
		
		json.NewEncoder(w).Encode(project)
	})

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

		err := executionService.ExecuteTask(projectID, task.ID, task.Description, "", "", task.AgentTag)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		
		json.NewEncoder(w).Encode(map[string]string{"status": "started"})
	})

	mux.HandleFunc("POST /api/projects/{id}/tasks/stop", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")
		
		err := executionService.StopExecution(projectID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		
		json.NewEncoder(w).Encode(map[string]string{"status": "stopped"})
	})

	mux.HandleFunc("/ws/output", executionService.BroadcastOutput)

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

	port := "8080"
	log.Printf("Starting Conductor Fleet Commander on http://localhost:%s\n", port)
	log.Printf("Monitoring project: %s\n", currentDir)
	
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}