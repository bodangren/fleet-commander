package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/conductor/fleet-commander/internal/agents"
	"github.com/conductor/fleet-commander/internal/harness"
)

type managementAPI struct {
	defaultProjectPath string
	userHomeDir        string
	discovery          *harness.DiscoveryService
}

type harnessListItem struct {
	Layer       harness.Layer       `json:"layer"`
	Definition  *harness.Definition `json:"definition"`
	BinaryFound bool                `json:"binaryFound"`
}

func newManagementAPI(defaultProjectPath string) *managementAPI {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = ""
	}
	return &managementAPI{
		defaultProjectPath: defaultProjectPath,
		userHomeDir:        homeDir,
		discovery:          harness.NewDiscoveryService(),
	}
}

func (m *managementAPI) register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/agents", m.handleListAgents)
	mux.HandleFunc("GET /api/agents/{name}", m.handleGetAgent)
	mux.HandleFunc("PUT /api/agents/{name}", m.handleSaveAgent)
	mux.HandleFunc("DELETE /api/agents/{name}", m.handleDeleteAgent)
	mux.HandleFunc("POST /api/agents/{name}/clone", m.handleCloneAgent)
	mux.HandleFunc("POST /api/agents/{name}/reset", m.handleResetAgent)
	mux.HandleFunc("POST /api/agents/{name}/test", m.handleTestAgent)

	mux.HandleFunc("GET /api/harnesses", m.handleListHarnesses)
	mux.HandleFunc("GET /api/harnesses/{name}", m.handleGetHarness)
	mux.HandleFunc("PUT /api/harnesses/{name}", m.handleSaveHarness)
	mux.HandleFunc("DELETE /api/harnesses/{name}", m.handleDeleteHarness)
	mux.HandleFunc("POST /api/harnesses/{name}/reset", m.handleResetHarness)
	mux.HandleFunc("GET /api/harnesses/{name}/models", m.handleDiscoverHarnessModels)
}

func (m *managementAPI) agentStore(projectPath string) *agents.Store {
	return agents.NewStore(agents.BundledFS, m.userAgentsDir(), m.projectAgentsDir(projectPath))
}

func (m *managementAPI) harnessStore(projectPath string) *harness.Store {
	return harness.NewStore(harness.BundledFS, m.userHarnessesDir(), m.projectHarnessesDir(projectPath))
}

func (m *managementAPI) defaultAgentStore() *agents.Store {
	return m.agentStore(m.defaultProjectPath)
}

func (m *managementAPI) defaultHarnessStore() *harness.Store {
	return m.harnessStore(m.defaultProjectPath)
}

func (m *managementAPI) userAgentsDir() string {
	if m.userHomeDir == "" {
		return ""
	}
	return filepath.Join(m.userHomeDir, ".conductor", "agents")
}

func (m *managementAPI) userHarnessesDir() string {
	if m.userHomeDir == "" {
		return ""
	}
	return filepath.Join(m.userHomeDir, ".conductor", "harnesses")
}

func (m *managementAPI) projectAgentsDir(projectPath string) string {
	if projectPath == "" {
		return ""
	}
	return filepath.Join(projectPath, "conductor", "agents")
}

func (m *managementAPI) projectHarnessesDir(projectPath string) string {
	if projectPath == "" {
		return ""
	}
	return filepath.Join(projectPath, "conductor", "harnesses")
}

func (m *managementAPI) requestProjectPath(r *http.Request) string {
	if project := r.URL.Query().Get("project"); project != "" {
		return project
	}
	return m.defaultProjectPath
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func binaryOnPath(binary string) bool {
	if binary == "" {
		return false
	}
	_, err := exec.LookPath(binary)
	return err == nil
}

func decodeJSONBody(r *http.Request, target any) error {
	return json.NewDecoder(r.Body).Decode(target)
}

func splitCommandLine(input string) ([]string, error) {
	var parts []string
	var current strings.Builder
	var quote rune
	escaped := false
	inToken := false

	flush := func() {
		if inToken {
			parts = append(parts, current.String())
			current.Reset()
			inToken = false
		}
	}

	for _, r := range input {
		if escaped {
			current.WriteRune(r)
			escaped = false
			inToken = true
			continue
		}

		if quote == 0 && r == '\\' {
			escaped = true
			continue
		}

		if quote != 0 {
			if r == quote {
				quote = 0
				continue
			}
			current.WriteRune(r)
			inToken = true
			continue
		}

		switch r {
		case '\'', '"':
			quote = r
			inToken = true
		case ' ', '\t', '\n', '\r':
			flush()
		default:
			current.WriteRune(r)
			inToken = true
		}
	}

	if escaped {
		return nil, fmt.Errorf("unterminated escape sequence in command template")
	}
	if quote != 0 {
		return nil, fmt.Errorf("unterminated quoted string in command template")
	}
	flush()
	return parts, nil
}

func buildHarnessTestCommand(def harness.Definition, modelID, prompt string) (string, []string, error) {
	template := strings.NewReplacer(
		"{model}", modelID,
		"{prompt}", prompt,
		"{file}", "",
	).Replace(def.Invocation.Template)

	parts, err := splitCommandLine(template)
	if err != nil {
		return "", nil, err
	}
	if len(parts) == 0 {
		return "", nil, fmt.Errorf("invocation template is empty")
	}

	command := def.Binary
	args := parts
	if first := parts[0]; first != "" {
		if first == def.Binary || filepath.Base(first) == filepath.Base(def.Binary) {
			args = parts[1:]
		}
	}

	return command, args, nil
}

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

func (m *managementAPI) describeScope(projectQuery string) string {
	if projectQuery != "" {
		return "project"
	}
	return "user"
}

func (m *managementAPI) defaultProjectDescription() string {
	if m.defaultProjectPath == "" {
		return ""
	}
	return fmt.Sprintf("project:%s", m.defaultProjectPath)
}
