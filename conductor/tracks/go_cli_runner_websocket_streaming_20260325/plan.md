# Implementation Plan - Go Backend - CLI Runner & WebSocket Streaming

## Phase 1: CLI Execution Setup
- [ ] Task: Create a `runner/` package.
- [ ] Task: Implement `CommandRunner` using `os/exec.CommandContext` to allow cancellation if a run takes too long.
- [ ] Task: Create a basic `AgentConfig` structure that maps a persona (e.g., `@frontend`) to a specific executable command (e.g., `gemini-cli`).

## Phase 2: Orchestrator Integration
- [ ] Task: Connect the `CommandRunner` into the Orchestrator Engine's `Run` lifecycle.
- [ ] Task: Implement logic to compile the final CLI arguments. For example, if the task is "Build login button", the runner should construct: `gemini-cli --prompt "Build login button"`.
- [ ] Task: Set up `io.Pipe` for the command's `stdout` and `stderr` so we can capture the output in real-time as the agent works.

## Phase 3: WebSocket Server
- [ ] Task: Add the `gorilla/websocket` dependency to the Go backend.
- [ ] Task: Create a WebSocket handler endpoint `GET /api/projects/:id/ws`.
- [ ] Task: Implement a broadcast hub in the Go daemon that allows clients to subscribe to a specific project's execution logs.

## Phase 4: Frontend Integration & Streaming Logs
- [ ] Task: In the Vite frontend, update the `ProjectView` to establish a WebSocket connection when the component mounts.
- [ ] Task: Create a `Terminal` or `LogViewer` Shadcn component on the project page.
- [ ] Task: As the Go `CommandRunner` reads lines from the agent's `stdout`/`stderr`, broadcast them over the WebSocket, and render them in the frontend `LogViewer` in real-time.