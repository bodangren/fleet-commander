# Specification — Agent & Harness Management UI

## Overview

A full-stack feature providing a web UI (served by the Go daemon) for managing AI agent personas and CLI harness configurations. Agent definitions follow a Markdown frontmatter specification and are stored in a layered resolution model: bundled defaults ship with the binary, user edits persist to `~/.measure/agents/`, and per-project overrides live in `measure/agents/`. Harness definitions (Claude Code, Gemini CLI, Opencode, Codex CLI) are declarative YAML files describing discovery commands, output parsing, and invocation templates, stored with the same layered model under `~/.measure/harnesses/`.

The app ships with default agent personas for every role in the team model (Architect, Senior Backend, Senior Frontend, Mid-level Dev, Junior Dev, Reviewer/QA, Dispatcher, Product Manager) with role-appropriate tool permissions and mode presets.

## Functional Requirements

### FR-1: Harness Definition Files

- Each supported CLI harness is described by a YAML definition file containing:
  - `name`: Display name (e.g., "Claude Code")
  - `binary`: Executable name or path (e.g., `claude`)
  - `discovery.command`: Shell command to invoke for model listing (e.g., `claude --help`)
  - `discovery.parse_strategy`: One of `regex`, `json`, `line-per-model`
  - `discovery.pattern`: Extraction pattern (regex group, jq path, etc.)
  - `invocation.template`: Parameterized command string with `{model}`, `{prompt}`, `{file}` placeholders
  - `invocation.flags`: Named optional flags (e.g., `dangerously_skip_permissions: "--dangerously-skip-permissions"`)
- Bundled defaults for: Claude Code, Gemini CLI, Opencode, Codex CLI
- User-created harness definitions supported via the UI

### FR-2: Live Model Discovery

- When a user selects a harness in the UI, the backend executes the harness's `discovery.command`
- The output is parsed using the declared `parse_strategy` + `pattern` to extract available model identifiers
- Results are returned to the frontend as a selectable list
- Discovery results are cached with a short TTL (e.g., 5 minutes) to avoid repeated shell invocations
- If the harness binary is not found on `$PATH`, surface a clear error in the UI

### FR-3: Agent Definition Files (Markdown Frontmatter Spec)

- Each agent is a `.md` file with YAML frontmatter and a Markdown body:
  ```markdown
  ---
  description: <one-line role description>
  mode: <agent | subagent>
  model: <harness/model-id>
  temperature: <0.0-1.0>
  tools:
    write: <bool>
    edit: <bool>
    bash: <bool>
  ---

  <System prompt / instructions in Markdown>
  ```
- The `model` field references a harness via prefix (e.g., `claude-code/claude-sonnet-4-20250514`)
- Storage layers (highest priority wins):
  1. Per-project: `<project>/measure/agents/<persona>.md`
  2. User-global: `~/.measure/agents/<persona>.md`
  3. Bundled defaults: embedded in binary

### FR-4: Default Team Personas

Ship the following agents with role-appropriate presets:

| Persona | Mode | Tools (write/edit/bash) | Temperature | Description |
|---------|------|------------------------|-------------|-------------|
| `architect` | agent | true/true/true | 0.3 | Decomposes specs into implementation plans and tasks |
| `product-manager` | subagent | false/false/false | 0.5 | Defines epics, priorities, and acceptance criteria |
| `senior-backend` | agent | true/true/true | 0.2 | Implements complex backend services and APIs |
| `senior-frontend` | agent | true/true/true | 0.2 | Implements complex UI components and state management |
| `mid-dev` | agent | true/true/false | 0.2 | Executes well-scoped implementation tasks |
| `junior-dev` | subagent | true/true/false | 0.1 | Executes pre-shaped tasks with clear criteria |
| `reviewer` | subagent | false/false/false | 0.1 | Reviews code for quality, bugs, security |
| `dispatcher` | subagent | false/false/false | 0.3 | Scores and ranks candidate tasks for selection |

### FR-5: Agent Management UI

- **Agent List View**: Grid/list of all agents showing persona name, description, harness, model, and override status (default / user-modified / project-override)
- **Agent Editor**:
  - Syntax-highlighted Markdown editor for the system prompt body
  - Visual toggle switches for tool permissions (write, edit, bash)
  - Temperature slider with presets ("Precise 0.1", "Balanced 0.5", "Creative 0.9")
  - Harness selector dropdown (populated from harness definitions)
  - Model selector dropdown (populated via live discovery after harness selection)
  - Mode selector (agent / subagent)
- **Clone Agent**: Duplicate an existing agent as a starting point for a new persona
- **Reset to Default**: Delete the user-global override, reverting to the bundled version
- **Delete**: Remove user-created agents (bundled defaults cannot be deleted, only overridden)

### FR-6: Harness Management UI

- **Harness List View**: All registered harnesses with name, binary, and binary-found status
- **Harness Editor**: Form-based editor for all YAML fields (discovery command, parse strategy, pattern, invocation template, flags)
- **Test Discovery**: Button that runs the discovery command and displays parsed results inline
- **Add Custom Harness**: Create a new harness definition from scratch

### FR-7: Test / Preview (Dry Run)

- A "Test Agent" button on the Agent Editor that:
  1. Resolves the agent's harness + model
  2. Invokes the harness with a trivial prompt (e.g., "Respond with OK")
  3. Streams the output back to the UI
  4. Reports success/failure and latency
- Validates that the full pipeline (harness binary -> model -> agent config) works end-to-end

## Non-Functional Requirements

- **NFR-1**: Agent and harness file I/O must not block the HTTP server; use goroutines for discovery commands
- **NFR-2**: Discovery command execution must have a timeout (30 seconds max)
- **NFR-3**: The Markdown editor should support at minimum syntax highlighting and basic preview
- **NFR-4**: All file writes must be atomic (write to temp file, then rename) to prevent corruption

## Acceptance Criteria

1. App ships with 8 default agent personas and 4 default harness definitions
2. Editing an agent in the UI persists changes to `~/.measure/agents/<persona>.md` without modifying bundled defaults
3. Selecting a harness triggers live model discovery; models appear in a dropdown within 30 seconds
4. If a harness binary is not on `$PATH`, a clear error is shown (not a crash)
5. Clone produces an independent copy; edits to the clone do not affect the original
6. "Reset to Default" restores the bundled version by removing the user-global file
7. "Test Agent" dry run completes and shows output/error in the UI
8. Per-project overrides in `measure/agents/` take precedence over user-global and bundled defaults

## Out of Scope

- Agent execution / dispatching (handled by the Orchestrator Engine track)
- Budget tracking or cost estimation
- Multi-user / auth (local-first single-user app)
- Agent-to-agent communication (handled by the Message Broker)
