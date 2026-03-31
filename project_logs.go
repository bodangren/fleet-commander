package main

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/conductor/fleet-commander/internal/database"
	"github.com/conductor/fleet-commander/internal/logs"
	"github.com/conductor/fleet-commander/internal/registry"
)

type logQueryStore interface {
	ReadRecent(limit int) ([]logs.LogEntry, error)
	ReadByDate(date string) ([]logs.LogEntry, error)
}

func registerProjectLogRoutes(mux *http.ServeMux, projectManager *registry.ProjectManager, loggers map[string]*logs.Logger, stores *database.Stores) {
	mux.HandleFunc("GET /api/projects/{id}/logs", func(w http.ResponseWriter, r *http.Request) {
		handleListLogs(w, r, projectManager, loggers)
	})

	mux.HandleFunc("GET /api/projects/{id}/logs/stats", func(w http.ResponseWriter, r *http.Request) {
		handleLogStats(w, r, projectManager, loggers)
	})

	mux.HandleFunc("GET /api/projects/{id}/logs/export", func(w http.ResponseWriter, r *http.Request) {
		handleExportLogs(w, r, projectManager, loggers)
	})
}

func getLoggerForProject(loggers map[string]*logs.Logger, projectID string) (*logs.Logger, bool) {
	l, ok := loggers[projectID]
	return l, ok
}

func handleListLogs(w http.ResponseWriter, r *http.Request, projectManager *registry.ProjectManager, loggers map[string]*logs.Logger) {
	projectID := r.PathValue("id")
	if _, exists := projectManager.GetProject(projectID); !exists {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
		return
	}

	logger, ok := getLoggerForProject(loggers, projectID)
	if !ok {
		writeJSON(w, http.StatusOK, map[string]interface{}{"logs": []logs.LogEntry{}, "total": 0})
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 500 {
			limit = parsed
		}
	}

	dateFilter := r.URL.Query().Get("date")
	agentFilter := r.URL.Query().Get("agent")

	var entries []logs.LogEntry
	var err error

	if dateFilter != "" {
		entries, err = logger.ReadByDate(dateFilter)
	} else {
		entries, err = logger.ReadRecent(limit * 2)
	}

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if agentFilter != "" {
		entries = filterByAgent(entries, agentFilter)
	}

	if len(entries) > limit {
		entries = entries[len(entries)-limit:]
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"logs":  entries,
		"total": len(entries),
	})
}

type logStats struct {
	TotalEntries    int              `json:"totalEntries"`
	DispatchCount   int              `json:"dispatchCount"`
	CompletionCount int              `json:"completionCount"`
	ErrorCount      int              `json:"errorCount"`
	AvgDurationMs   float64          `json:"avgDurationMs"`
	SuccessRate     float64          `json:"successRate"`
	AgentBreakdown  []agentStatEntry `json:"agentBreakdown"`
}

type agentStatEntry struct {
	Agent  string  `json:"agent"`
	Runs   int     `json:"runs"`
	AvgMs  float64 `json:"avgMs"`
	Errors int     `json:"errors"`
}

func handleLogStats(w http.ResponseWriter, r *http.Request, projectManager *registry.ProjectManager, loggers map[string]*logs.Logger) {
	projectID := r.PathValue("id")
	if _, exists := projectManager.GetProject(projectID); !exists {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
		return
	}

	logger, ok := getLoggerForProject(loggers, projectID)
	if !ok {
		writeJSON(w, http.StatusOK, logStats{})
		return
	}

	entries, err := logger.ReadRecent(500)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	stats := computeLogStats(entries)
	writeJSON(w, http.StatusOK, stats)
}

func computeLogStats(entries []logs.LogEntry) logStats {
	var stats logStats
	stats.TotalEntries = len(entries)

	agentMap := make(map[string]*agentStatEntry)
	var totalDuration int64
	var completionCount int
	var errorCount int

	for _, entry := range entries {
		switch entry.Type {
		case logs.TypeDispatch:
			stats.DispatchCount++
			if data, ok := entry.Data.(map[string]interface{}); ok {
				if agent, ok := data["agentTag"].(string); ok && agent != "" {
					if _, exists := agentMap[agent]; !exists {
						agentMap[agent] = &agentStatEntry{Agent: agent}
					}
					agentMap[agent].Runs++
				}
			}
		case logs.TypeCompletion:
			completionCount++
			if data, ok := entry.Data.(map[string]interface{}); ok {
				if dur, ok := data["durationMs"].(float64); ok {
					totalDuration += int64(dur)
				}
				if status, ok := data["status"].(string); ok && status == "error" {
					errorCount++
				}
			}
		case logs.TypeError:
			errorCount++
			stats.ErrorCount++
		}
	}

	stats.CompletionCount = completionCount
	if stats.ErrorCount == 0 {
		stats.ErrorCount = errorCount
	}

	if completionCount > 0 {
		stats.AvgDurationMs = float64(totalDuration) / float64(completionCount)
		total := completionCount
		successful := total - errorCount
		stats.SuccessRate = float64(successful) / float64(total) * 100
	}

	for _, a := range agentMap {
		stats.AgentBreakdown = append(stats.AgentBreakdown, *a)
	}

	return stats
}

func handleExportLogs(w http.ResponseWriter, r *http.Request, projectManager *registry.ProjectManager, loggers map[string]*logs.Logger) {
	projectID := r.PathValue("id")
	if _, exists := projectManager.GetProject(projectID); !exists {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
		return
	}

	logger, ok := getLoggerForProject(loggers, projectID)
	if !ok {
		w.Header().Set("Content-Type", "text/csv")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=logs-%s.csv", projectID))
		w.Write([]byte("timestamp,type,task_id,agent,status,duration_ms\n"))
		return
	}

	entries, err := logger.ReadRecent(1000)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=logs-%s-%s.csv", projectID, time.Now().Format("2006-01-02")))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{"timestamp", "type", "task_id", "agent", "status", "duration_ms"})

	for _, entry := range entries {
		taskID, agent, status, duration := extractLogFields(entry)
		writer.Write([]string{
			entry.Timestamp.Format(time.RFC3339),
			string(entry.Type),
			taskID,
			agent,
			status,
			duration,
		})
	}
}

func extractLogFields(entry logs.LogEntry) (taskID, agent, status, duration string) {
	if data, ok := entry.Data.(map[string]interface{}); ok {
		if v, ok := data["taskId"].(string); ok {
			taskID = v
		}
		if v, ok := data["agentTag"].(string); ok {
			agent = v
		} else if v, ok := data["agentName"].(string); ok {
			agent = v
		}
		if v, ok := data["status"].(string); ok {
			status = v
		}
		if v, ok := data["durationMs"].(float64); ok {
			duration = fmt.Sprintf("%.0f", v)
		}
	}
	return
}

func filterByAgent(entries []logs.LogEntry, agent string) []logs.LogEntry {
	var filtered []logs.LogEntry
	for _, entry := range entries {
		if data, ok := entry.Data.(map[string]interface{}); ok {
			if tag, ok := data["agentTag"].(string); ok && tag == agent {
				filtered = append(filtered, entry)
				continue
			}
			if name, ok := data["agentName"].(string); ok && name == agent {
				filtered = append(filtered, entry)
				continue
			}
		}
	}
	return filtered
}
