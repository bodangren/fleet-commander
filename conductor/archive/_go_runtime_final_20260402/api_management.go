package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/conductor/fleet-commander/internal/agents"
	"github.com/conductor/fleet-commander/internal/harness"
)

type managementAPI struct {
	defaultProjectPath string
	userHomeDir        string
	discovery          *harness.DiscoveryService
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
