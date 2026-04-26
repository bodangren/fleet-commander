# Implementation Plan - CLI Process Manager

## Phase 1: Process Execution
- [ ] Task: Create `runner/` package.
- [ ] Task: Implement `CommandRunner` using `os/exec.CommandContext` (to allow context cancellation).
- [ ] Task: Set up `stdout` and `stderr` pipes for the command.

## Phase 2: Agent Configuration
- [ ] Task: Create `AgentConfig` model defining CLI mapping (e.g., Tag: `@gemini`, Cmd: `gemini-cli`, Args: `["--prompt", "{{task}}"]`).
- [ ] Task: Implement logic to compile the final command string by injecting the task description and `spec.md` context.

## Phase 3: WebSocket Streaming
- [ ] Task: Add `gorilla/websocket` dependency.
- [ ] Task: Create a WebSocket handler in the HTTP server.
- [ ] Task: As the `CommandRunner` reads lines from `stdout`/`stderr`, broadcast them to connected WebSocket clients.

## Phase 4: Execution Queue (Basic)
- [ ] Task: Create an `ExecutionQueue` service that locks a project while an agent is running.
- [ ] Task: Expose API to manually trigger an agent for a specific Task ID.
- [ ] Task: Expose API to terminate the currently running process in a project.
