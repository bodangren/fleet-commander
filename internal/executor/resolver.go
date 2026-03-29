package executor

import (
	"fmt"
	"strings"

	"github.com/conductor/fleet-commander/internal/agents"
	"github.com/conductor/fleet-commander/internal/harness"
)

type AgentHarnessResolver struct {
	agents    map[string]*agents.ResolvedDefinition
	harnesses map[string]*harness.ResolvedDefinition
}

func NewAgentHarnessResolver(agentStore *agents.Store, harnessStore *harness.Store) *AgentHarnessResolver {
	r := &AgentHarnessResolver{
		agents:    make(map[string]*agents.ResolvedDefinition),
		harnesses: make(map[string]*harness.ResolvedDefinition),
	}

	if agentStore != nil && harnessStore != nil {
		agentList, _ := agentStore.List()
		for i := range agentList {
			r.agents[strings.ToLower(agentList[i].Definition.Name)] = &agentList[i]
		}
		harnessList, _ := harnessStore.List()
		for i := range harnessList {
			r.harnesses[strings.ToLower(harnessList[i].Definition.Name)] = &harnessList[i]
		}
	}

	return r
}

func (r *AgentHarnessResolver) RegisterAgent(def *agents.ResolvedDefinition) {
	r.agents[strings.ToLower(def.Definition.Name)] = def
}

func (r *AgentHarnessResolver) RegisterHarness(def *harness.ResolvedDefinition) {
	r.harnesses[strings.ToLower(def.Definition.Name)] = def
}

func (r *AgentHarnessResolver) Resolve(agentName, prompt string) (string, []string, error) {
	agent, found := r.agents[strings.ToLower(agentName)]
	if !found {
		return "echo", []string{prompt}, nil
	}

	harnessName, modelID, ok := strings.Cut(agent.Definition.Model, "/")
	if !ok || harnessName == "" || modelID == "" {
		return "echo", []string{prompt}, nil
	}

	h, found := r.harnesses[strings.ToLower(harnessName)]
	if !found {
		return "echo", []string{prompt}, nil
	}

	template := strings.NewReplacer(
		"{model}", modelID,
		"{prompt}", prompt,
		"{file}", "",
	).Replace(h.Definition.Invocation.Template)

	parts, err := splitCommandLine(template)
	if err != nil {
		return "", nil, fmt.Errorf("failed to parse invocation template: %w", err)
	}

	if len(parts) == 0 {
		return "echo", []string{prompt}, nil
	}

	command := h.Definition.Binary
	args := parts
	if first := parts[0]; first != "" {
		if first == h.Definition.Binary || strings.HasSuffix(first, "/"+h.Definition.Binary) {
			args = parts[1:]
		}
	}

	return command, args, nil
}

func (r *AgentHarnessResolver) HasAgent(name string) bool {
	_, found := r.agents[strings.ToLower(name)]
	return found
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
