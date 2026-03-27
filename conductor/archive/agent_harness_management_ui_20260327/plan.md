# Implementation Plan — Agent & Harness Management UI

## Phase 1: Harness Definition Layer (Go Backend)
- [x] Task: Define the `HarnessDefinition` struct in `internal/models/` with fields for Name, Binary, Discovery (Command, ParseStrategy, Pattern), and Invocation (Template, Flags), including YAML serialization tags.
- [x] Task: Write unit tests for YAML serialization and deserialization of `HarnessDefinition`.
- [x] Task: Create bundled default harness YAML files for Claude Code, Gemini CLI, Opencode, and Codex CLI.
- [x] Task: Embed the default harness files into the binary using `embed.FS` and write tests verifying all 4 parse correctly.
- [x] Task: Implement `HarnessStore` service with layered resolution (bundled defaults fallback, user-global `~/.conductor/harnesses/` overrides).
- [x] Task: Write tests for `HarnessStore` layered resolution: bundled fallback, user override precedence, list-all merging, reset-to-default.
- [x] Task: Implement atomic file writes (write to temp file, then rename) in `HarnessStore.Save()`.

## Phase 2: Live Model Discovery (Go Backend)
- [x] Task: Implement `DiscoveryService` that executes a harness's discovery command and parses output using the declared parse strategy.
- [x] Task: Write tests for each parse strategy (`regex`, `json`, `line-per-model`) using mocked command output.
- [x] Task: Add 30-second timeout to discovery command execution via `context.WithTimeout`.
- [x] Task: Implement in-memory TTL cache (5 minutes) for discovery results.
- [x] Task: Write tests for cache hit, cache miss, and cache expiry scenarios.
- [x] Task: Add binary-existence check via `exec.LookPath` with clear error propagation when harness binary is not on `$PATH`.

## Phase 3: Agent Definition Layer (Go Backend)
- [x] Task: Define the `AgentDefinition` struct in `internal/models/` matching the Markdown frontmatter spec (description, mode, model, temperature, tools map, body).
- [x] Task: Implement a parser and serializer for the `.md` agent format (YAML frontmatter + Markdown body roundtrip).
- [x] Task: Write unit tests for Markdown frontmatter parsing and serialization roundtrip.
- [x] Task: Create bundled default agent `.md` files for all 8 team personas: architect, product-manager, senior-backend, senior-frontend, mid-dev, junior-dev, reviewer, dispatcher.
- [x] Task: Embed the default agent files using `embed.FS` and write tests verifying all 8 parse correctly with expected field values.
- [x] Task: Implement `AgentStore` with three-layer resolution (bundled → user-global `~/.conductor/agents/` → per-project `conductor/agents/`).
- [x] Task: Write tests for `AgentStore` three-layer precedence, list-all merging, override detection, clone, and reset-to-default.
- [x] Task: Implement atomic file writes in `AgentStore.Save()`.

## Phase 4: REST API Endpoints (Go Backend)
- [x] Task: Implement harness CRUD endpoints: `GET /api/harnesses`, `GET /api/harnesses/:name`, `PUT /api/harnesses/:name`, `DELETE /api/harnesses/:name`.
- [x] Task: Write integration tests for all harness CRUD endpoints.
- [x] Task: Implement model discovery endpoint `GET /api/harnesses/:name/models` wired to `DiscoveryService`.
- [x] Task: Write integration tests for model discovery endpoint including success and binary-not-found cases.
- [x] Task: Implement agent CRUD endpoints: `GET /api/agents`, `GET /api/agents/:name`, `PUT /api/agents/:name`, `DELETE /api/agents/:name`, `POST /api/agents/:name/clone`, with `?project=<path>` query parameter for per-project scope.
- [x] Task: Write integration tests for all agent CRUD endpoints.
- [x] Task: Implement agent dry-run endpoint `POST /api/agents/:name/test` that resolves harness + model, invokes with trivial prompt, and returns output + latency.
- [x] Task: Write integration test for agent dry-run endpoint.
- [x] Task: Implement reset-to-default endpoints `POST /api/agents/:name/reset` and `POST /api/harnesses/:name/reset`.
- [x] Task: Write tests for reset-to-default endpoints.

## Phase 5: Agent List View (Frontend)
- [x] Task: Create the `AgentsPage` route (`/agents`) and add a navigation link to the sidebar.
- [x] Task: Build the `AgentCard` Shadcn component displaying persona name, description, harness, model, and override badge (Default / Modified / Project).
- [x] Task: Fetch and render the agent list from `GET /api/agents` as a grid of `AgentCard` components with loading, empty, and error states.
- [x] Task: Write component tests for `AgentsPage` and `AgentCard`.
- [x] Task: Conductor — User Manual Verification 'Agent List View' (Protocol in workflow.md)

## Phase 6: Agent Editor (Frontend)
- [x] Task: Build the `AgentEditor` page mapped to `/agents/:name/edit` with base layout and form sections.
- [x] Task: Integrate a syntax-highlighted Markdown editor component for the system prompt body.
- [x] Task: Implement tool permission toggle switches (write, edit, bash) using Shadcn Switch components.
- [x] Task: Implement temperature slider with preset buttons ("Precise 0.1", "Balanced 0.5", "Creative 0.9") using Shadcn Slider.
- [x] Task: Implement harness selector dropdown populated from `GET /api/harnesses`.
- [x] Task: Implement model selector dropdown that calls `GET /api/harnesses/:name/models` on harness change, with loading and error states for binary-not-found.
- [x] Task: Implement Save, Clone, Reset to Default, and Delete actions with destructive action confirmation dialogs per product guidelines.
- [x] Task: Write component tests for `AgentEditor` covering form binding, harness/model selection, and action buttons.
- [x] Task: Conductor — User Manual Verification 'Agent Editor' (Protocol in workflow.md)

## Phase 7: Harness Management UI (Frontend)
- [x] Task: Create the `HarnessesPage` route (`/harnesses`) and add a navigation link to the sidebar.
- [x] Task: Build the `HarnessCard` Shadcn component with name, binary, and binary-found status indicator (green/red badge).
- [x] Task: Build the `HarnessEditor` form for all YAML fields (name, binary, discovery command, parse strategy, pattern, invocation template, flags).
- [x] Task: Implement "Test Discovery" button that calls `GET /api/harnesses/:name/models` and displays parsed model list inline.
- [x] Task: Implement "Add Custom Harness" creation flow with blank form and save.
- [x] Task: Write component tests for `HarnessesPage`, `HarnessCard`, and `HarnessEditor`.
- [x] Task: Conductor — User Manual Verification 'Harness Management UI' (Protocol in workflow.md)

## Phase 8: Agent Dry Run / Test Preview (Frontend)
- [x] Task: Add "Test Agent" button to the Agent Editor that calls `POST /api/agents/:name/test` and displays streaming output in a terminal-style panel.
- [x] Task: Display result summary (success/failure badge, latency, truncated output) using Shadcn Alert component.
- [x] Task: Write component tests for dry-run button and result display.
- [x] Task: Conductor — User Manual Verification 'Agent Dry Run' (Protocol in workflow.md)
