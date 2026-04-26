package main

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/measure/fleet-commander/internal/database"
	"github.com/measure/fleet-commander/internal/logs"
	"github.com/measure/fleet-commander/internal/registry"
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

	mux.HandleFunc("GET /api/projects/{id}/tasks/{taskId}/review", func(w http.ResponseWriter, r *http.Request) {
		handleTaskReview(w, r, projectManager, loggers)
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

// ReviewComment is an inline comment from the LLM reviewer agent.
type ReviewComment struct {
	File     string `json:"file"`
	Line     int    `json:"line"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

// AgentReviewResult contains the LLM-based qualitative review for a task.
type AgentReviewResult struct {
	Status   string          `json:"status"`
	Comments []ReviewComment `json:"comments"`
	Depth    string          `json:"depth"`
}

// ReviewResult is the API response for a task's review results.
type ReviewResult struct {
	Category string   `json:"category"`
	Status   string   `json:"status"`
	Errors   []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
	Output   string   `json:"output,omitempty"`
	Duration int64    `json:"durationMs"`
}

// ReviewResponse is the API response for task review results.
type ReviewResponse struct {
	TaskID      string             `json:"taskId"`
	Status      string             `json:"status"`
	Results     []ReviewResult     `json:"results,omitempty"`
	ReviewedAt  string             `json:"reviewedAt,omitempty"`
	AgentReview *AgentReviewResult `json:"agentReview,omitempty"`
	ReviewDepth string             `json:"reviewDepth,omitempty"`
}

func handleTaskReview(w http.ResponseWriter, r *http.Request, projectManager *registry.ProjectManager, loggers map[string]*logs.Logger) {
	projectID := r.PathValue("id")
	taskID := r.PathValue("taskId")

	if _, exists := projectManager.GetProject(projectID); !exists {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
		return
	}

	logger, ok := getLoggerForProject(loggers, projectID)
	if !ok {
		writeJSON(w, http.StatusOK, ReviewResponse{TaskID: taskID, Status: "not_found"})
		return
	}

	entries, err := logger.ReadRecent(200)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	var cmdResults []ReviewResult
	var overallStatus string
	var reviewedAt string
	var agentReview *AgentReviewResult

	for i := len(entries) - 1; i >= 0; i-- {
		entry := entries[i]
		if entry.Type != logs.TypeCompletion {
			continue
		}
		data, dataOk := entry.Data.(map[string]interface{})
		if !dataOk {
			continue
		}
		if tid, ok := data["taskId"].(string); !ok || tid != taskID {
			continue
		}

		if status, ok := data["status"].(string); ok && status == "reviewed" {
			cmdResults = parseCommandResults(data)
			overallStatus = computeOverallStatus(cmdResults)
			if v, ok := data["reviewedAt"].(string); ok {
				reviewedAt = v
			}
		}

		if status, ok := data["status"].(string); ok && status == "agent-reviewed" {
			agentReview = parseAgentReview(data)
		}
	}

	if overallStatus == "" && agentReview == nil {
		writeJSON(w, http.StatusOK, ReviewResponse{TaskID: taskID, Status: "not_found"})
		return
	}

	if overallStatus == "" {
		overallStatus = "not_found"
	}

	resp := ReviewResponse{
		TaskID:      taskID,
		Status:      overallStatus,
		Results:     cmdResults,
		ReviewedAt:  reviewedAt,
		AgentReview: agentReview,
	}
	if agentReview != nil {
		resp.ReviewDepth = agentReview.Depth
	}

	writeJSON(w, http.StatusOK, resp)
}

func parseCommandResults(data map[string]interface{}) []ReviewResult {
	var results []ReviewResult
	if rawResults, ok := data["results"].([]interface{}); ok {
		for _, raw := range rawResults {
			if rm, ok := raw.(map[string]interface{}); ok {
				result := ReviewResult{}
				if v, ok := rm["category"].(string); ok {
					result.Category = v
				}
				if v, ok := rm["status"].(string); ok {
					result.Status = v
				}
				if v, ok := rm["output"].(string); ok {
					result.Output = v
				}
				if v, ok := rm["durationMs"].(float64); ok {
					result.Duration = int64(v)
				}
				if v, ok := rm["errors"].([]interface{}); ok {
					for _, e := range v {
						if s, ok := e.(string); ok {
							result.Errors = append(result.Errors, s)
						}
					}
				}
				if v, ok := rm["warnings"].([]interface{}); ok {
					for _, w := range v {
						if s, ok := w.(string); ok {
							result.Warnings = append(result.Warnings, s)
						}
					}
				}
				results = append(results, result)
			}
		}
	}
	return results
}

func computeOverallStatus(results []ReviewResult) string {
	for _, r := range results {
		if r.Status == "failed" || r.Status == "timeout" {
			return "failed"
		}
	}
	if len(results) > 0 {
		return "passed"
	}
	return ""
}

func parseAgentReview(data map[string]interface{}) *AgentReviewResult {
	review := &AgentReviewResult{}
	if v, ok := data["agentStatus"].(string); ok {
		review.Status = v
	}
	if v, ok := data["reviewDepth"].(string); ok {
		review.Depth = v
	}
	if rawComments, ok := data["agentComments"].([]interface{}); ok {
		for _, raw := range rawComments {
			if rm, ok := raw.(map[string]interface{}); ok {
				c := ReviewComment{}
				if v, ok := rm["file"].(string); ok {
					c.File = v
				}
				if v, ok := rm["line"].(float64); ok {
					c.Line = int(v)
				}
				if v, ok := rm["severity"].(string); ok {
					c.Severity = v
				}
				if v, ok := rm["message"].(string); ok {
					c.Message = v
				}
				review.Comments = append(review.Comments, c)
			}
		}
	}
	return review
}
