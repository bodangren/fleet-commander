package main

import (
	"encoding/json"
	"net/http"

	"github.com/measure/fleet-commander/internal/executor"
	"github.com/measure/fleet-commander/internal/hub"
	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/registry"
)

// TaskExecutionDeps holds dependencies for task execution route handlers
type TaskExecutionDeps struct {
	ProjectManager   *registry.ProjectManager
	ExecutionService *executor.ExecutionService
	WebSocketHub     *hub.Hub
}

type ExecuteTaskRequest struct {
	TaskID string `json:"taskId"`
	Agent  string `json:"agent"`
}

func handleExecuteTask(deps *TaskExecutionDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		var req ExecuteTaskRequest
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

		if _, err := deps.ExecutionService.ExecuteTask(projectID, task.ID, task.Description, "", "", task.AgentTag); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"status": "started"})
	}
}

func handleStopTask(deps *TaskExecutionDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID := r.PathValue("id")

		if err := deps.ExecutionService.StopExecution(projectID); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"status": "stopped"})
	}
}

func handleWebSocketOutput(deps *TaskExecutionDeps) http.HandlerFunc {
	return deps.ExecutionService.BroadcastOutput
}

func handleProjectWebSocket(deps *TaskExecutionDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := r.PathValue("id")
		deps.WebSocketHub.ServeWS(projectID, w, r)
	}
}
