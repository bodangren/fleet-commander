package main

import (
	"net/http"
	"strconv"

	"github.com/conductor/fleet-commander/internal/database"
)

func registerStatsRoutes(mux *http.ServeMux, stores *database.Stores) {
	mux.HandleFunc("GET /api/stats/overview", func(w http.ResponseWriter, r *http.Request) {
		stats, err := stores.Stats.GetOverviewStats()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, stats)
	})

	mux.HandleFunc("GET /api/stats/agents", func(w http.ResponseWriter, r *http.Request) {
		var from, to int64
		if v := r.URL.Query().Get("from"); v != "" {
			from, _ = strconv.ParseInt(v, 10, 64)
		}
		if v := r.URL.Query().Get("to"); v != "" {
			to, _ = strconv.ParseInt(v, 10, 64)
		}

		agents, err := stores.Stats.GetAgentStats(from, to)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		if agents == nil {
			agents = []database.AgentStats{}
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"agents": agents})
	})

	mux.HandleFunc("GET /api/stats/issues", func(w http.ResponseWriter, r *http.Request) {
		stats, err := stores.Stats.GetIssueStats()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, stats)
	})

	mux.HandleFunc("GET /api/stats/velocity", func(w http.ResponseWriter, r *http.Request) {
		days := 30
		if v := r.URL.Query().Get("days"); v != "" {
			if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
				days = parsed
			}
		}

		velocity, err := stores.Stats.GetVelocity(days)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		if velocity == nil {
			velocity = []database.DailyVelocity{}
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"velocity": velocity, "days": days})
	})
}
