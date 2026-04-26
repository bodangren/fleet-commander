package main

import (
	"context"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/measure/fleet-commander/internal/harness"
)

type harnessListItem struct {
	Layer       harness.Layer       `json:"layer"`
	Definition  *harness.Definition `json:"definition"`
	BinaryFound bool                `json:"binaryFound"`
}

func (m *managementAPI) handleListHarnesses(w http.ResponseWriter, r *http.Request) {
	store := m.harnessStore(m.requestProjectPath(r))
	list, err := store.List()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response := make([]harnessListItem, 0, len(list))
	for _, item := range list {
		response = append(response, harnessListItem{
			Layer:       item.Layer,
			Definition:  item.Definition,
			BinaryFound: binaryOnPath(item.Definition.Binary),
		})
	}
	writeJSON(w, http.StatusOK, response)
}

func (m *managementAPI) handleGetHarness(w http.ResponseWriter, r *http.Request) {
	store := m.harnessStore(m.requestProjectPath(r))
	name := r.PathValue("name")
	resolved, found, err := store.Get(name)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if !found {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "harness not found"})
		return
	}
	writeJSON(w, http.StatusOK, harnessListItem{
		Layer:       resolved.Layer,
		Definition:  resolved.Definition,
		BinaryFound: binaryOnPath(resolved.Definition.Binary),
	})
}

func (m *managementAPI) handleSaveHarness(w http.ResponseWriter, r *http.Request) {
	store := m.harnessStore(m.requestProjectPath(r))
	var def harness.Definition
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

func (m *managementAPI) handleDeleteHarness(w http.ResponseWriter, r *http.Request) {
	store := m.harnessStore(m.requestProjectPath(r))
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

func (m *managementAPI) handleResetHarness(w http.ResponseWriter, r *http.Request) {
	store := m.harnessStore(m.requestProjectPath(r))
	if err := store.Reset(r.PathValue("name")); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "reset"})
}

func (m *managementAPI) handleDiscoverHarnessModels(w http.ResponseWriter, r *http.Request) {
	store := m.harnessStore(m.requestProjectPath(r))
	resolved, found, err := store.Get(r.PathValue("name"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if !found {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "harness not found"})
		return
	}

	modelsList, err := m.discovery.Discover(resolved.Definition)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"models": modelsList})
}

func (m *managementAPI) handleTestAgent(w http.ResponseWriter, r *http.Request) {
	projectPath := m.requestProjectPath(r)
	agentStore := m.agentStore(projectPath)
	agentName := r.PathValue("name")

	resolvedAgent, found, err := agentStore.Get(agentName)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if !found {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "agent not found"})
		return
	}

	harnessName, modelID, ok := strings.Cut(resolvedAgent.Definition.Model, "/")
	if !ok || harnessName == "" || modelID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "agent model must use harness/model format"})
		return
	}

	harnessStore := m.harnessStore(projectPath)
	resolvedHarness, found, err := harnessStore.Get(harnessName)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if !found {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "harness not found"})
		return
	}

	if _, err := exec.LookPath(resolvedHarness.Definition.Binary); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("harness binary %q not found on PATH", resolvedHarness.Definition.Binary)})
		return
	}

	prompt := "Respond with OK"
	command, args, err := buildHarnessTestCommand(*resolvedHarness.Definition, modelID, prompt)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	start := time.Now()
	output, runErr := exec.CommandContext(ctx, command, args...).CombinedOutput()
	latencyMs := time.Since(start).Milliseconds()
	status := "success"
	if runErr != nil {
		status = "failed"
	}

	response := map[string]any{
		"status":    status,
		"latencyMs": latencyMs,
		"output":    string(output),
	}
	if runErr != nil {
		response["error"] = runErr.Error()
	}

	writeJSON(w, http.StatusOK, response)
}
