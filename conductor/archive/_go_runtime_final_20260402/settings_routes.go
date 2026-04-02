package main

import (
	"encoding/json"
	"net/http"

	"github.com/conductor/fleet-commander/internal/config"
)

// SettingsDeps holds dependencies for settings route handlers
type SettingsDeps struct {
	ConfigManager *config.ConfigManager
	ApplyConfig   func(*config.AppConfig)
}

func handleGetSettings(deps *SettingsDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if deps.ConfigManager == nil {
			json.NewEncoder(w).Encode(config.DefaultAppConfig())
			return
		}
		cfg, err := deps.ConfigManager.LoadAppConfig()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		json.NewEncoder(w).Encode(cfg)
	}
}

func handleUpdateSettings(deps *SettingsDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if deps.ConfigManager == nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "config manager not available"})
			return
		}

		var incoming config.AppConfig
		if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
			return
		}

		// Load current, merge with incoming, validate, save
		current, err := deps.ConfigManager.LoadAppConfig()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		current.Merge(&incoming)
		if err := current.Validate(); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		if err := deps.ConfigManager.SaveAppConfig(current); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		// Apply config changes to runtime services
		deps.ApplyConfig(current)

		json.NewEncoder(w).Encode(current)
	}
}
