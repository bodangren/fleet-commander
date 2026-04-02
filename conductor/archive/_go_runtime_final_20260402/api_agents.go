package main

import (
	"net/http"

	"github.com/conductor/fleet-commander/internal/agents"
)

func (m *managementAPI) handleListAgents(w http.ResponseWriter, r *http.Request) {
	store := m.agentStore(m.requestProjectPath(r))
	list, err := store.List()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (m *managementAPI) handleGetAgent(w http.ResponseWriter, r *http.Request) {
	store := m.agentStore(m.requestProjectPath(r))
	name := r.PathValue("name")
	resolved, found, err := store.Get(name)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if !found {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "agent not found"})
		return
	}
	writeJSON(w, http.StatusOK, resolved)
}

func (m *managementAPI) handleSaveAgent(w http.ResponseWriter, r *http.Request) {
	store := m.agentStore(m.requestProjectPath(r))
	var def agents.Definition
	if err := decodeJSONBody(r, &def); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	def.Name = r.PathValue("name")

	if r.URL.Query().Get("project") != "" {
		if err := store.SaveProject(&def); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, def)
		return
	}
	if err := store.SaveUser(&def); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, def)
}

func (m *managementAPI) handleDeleteAgent(w http.ResponseWriter, r *http.Request) {
	store := m.agentStore(m.requestProjectPath(r))
	name := r.PathValue("name")
	if r.URL.Query().Get("project") != "" {
		if err := store.ResetProject(name); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
		return
	}
	if err := store.ResetUser(name); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (m *managementAPI) handleCloneAgent(w http.ResponseWriter, r *http.Request) {
	store := m.agentStore(m.requestProjectPath(r))
	var req struct {
		Name string `json:"name"`
	}
	if err := decodeJSONBody(r, &req); err != nil || req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}

	scope := agents.LayerUser
	if r.URL.Query().Get("project") != "" {
		scope = agents.LayerProject
	}
	if err := store.Clone(r.PathValue("name"), req.Name, scope); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "cloned", "name": req.Name})
}

func (m *managementAPI) handleResetAgent(w http.ResponseWriter, r *http.Request) {
	store := m.agentStore(m.requestProjectPath(r))
	if err := store.Reset(r.PathValue("name")); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "reset"})
}
