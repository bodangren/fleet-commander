# Specification - Agent Issue Auto-Creation

## Overview

Agents currently execute tasks and produce output streamed via WebSocket, but there is no mechanism for agents to report issues they discover during execution. This track defines an output format for issue reporting, parses agent output post-execution, auto-creates issues in the project store, and broadcasts new issues to the frontend in real time.

## Functional Requirements

- **FR1**: Define a structured output format agents use to report issues — e.g., fenced blocks matching `` ```issue `` with JSON or YAML fields (title, description, severity, labels).
- **FR2**: After a task completes, parse the agent's execution output for issue markers and extract structured issue data.
- **FR3**: Auto-create issues via `issues.Store.Save()` for each parsed issue, linking them to the originating task.
- **FR4**: Broadcast newly created issues via WebSocket so the Issues list UI updates in real time without page refresh.
- **FR5**: Inject an issue reporting template into agent prompts so agents know the expected output format.

## Acceptance Criteria

1. An agent output containing a `` ```issue `` block with valid JSON is parsed into an `Issue` struct with title, description, and severity fields.
2. Malformed or incomplete issue blocks are logged as warnings and skipped (no crash, no partial issue creation).
3. After task completion, each parsed issue is persisted to the issue store with a reference to the task ID.
4. A WebSocket `issue_created` event is broadcast with the full issue payload immediately after creation.
5. The Issues list page receives `issue_created` events and appends new issues without requiring a refresh.
6. Agent prompts include a template section instructing agents to use the `` ```issue `` format.
7. Existing issue store CRUD tests and WebSocket tests continue to pass.

## Out of Scope

- Issue deduplication or similarity detection.
- Agent-initiated issue resolution or status updates.
- Custom issue templates per project.
