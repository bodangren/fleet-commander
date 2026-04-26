package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/measure/fleet-commander/internal/backup"
	"github.com/measure/fleet-commander/internal/registry"
)

func registerBackupRoutes(mux *http.ServeMux, projectManager *registry.ProjectManager) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Printf("Warning: cannot determine home directory for backups: %v", err)
		return
	}
	backupDir := filepath.Join(homeDir, ".measure", "backups")

	mux.HandleFunc("POST /api/backup/create", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Project string `json:"project"`
			Full    bool   `json:"full"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
			return
		}

		if req.Full {
			measureDir := filepath.Join(homeDir, ".measure")
			path, err := backup.CreateFullBackup(measureDir, backupDir)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			info, _ := os.Stat(path)
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"path": path,
				"size": info.Size(),
				"type": "full",
			})
			return
		}

		if req.Project == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "project name or 'full: true' required"})
			return
		}

		// Find project by ID or name
		var projectPath string
		for _, p := range projectManager.GetAllProjects() {
			if p.ID == req.Project || p.Name == req.Project {
				projectPath = p.Path
				break
			}
		}
		if projectPath == "" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Project not found"})
			return
		}

		path, err := backup.CreateProjectBackup(projectPath, backupDir)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		info, _ := os.Stat(path)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"path": path,
			"size": info.Size(),
			"type": "project",
		})
	})

	mux.HandleFunc("GET /api/backup/list", func(w http.ResponseWriter, r *http.Request) {
		entries, err := os.ReadDir(backupDir)
		if err != nil {
			writeJSON(w, http.StatusOK, map[string]interface{}{"backups": []interface{}{}})
			return
		}

		type backupEntry struct {
			Name string `json:"name"`
			Size int64  `json:"size"`
			Path string `json:"path"`
		}

		var backups []backupEntry
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".zip") {
				continue
			}
			info, err := entry.Info()
			if err != nil {
				continue
			}
			backups = append(backups, backupEntry{
				Name: entry.Name(),
				Size: info.Size(),
				Path: filepath.Join(backupDir, entry.Name()),
			})
		}

		sort.Slice(backups, func(i, j int) bool {
			return backups[i].Name > backups[j].Name // newest first
		})

		writeJSON(w, http.StatusOK, map[string]interface{}{"backups": backups})
	})
}
