# Implementation Plan - Go Backend - CLI Runner & WebSocket Streaming

## Phase 1: CLI Execution Setup
- [x] Task: Create a `runner/` package.
- [x] Task: Implement `CommandRunner` using `os/exec.CommandContext` to allow cancellation if a run takes too long.
- [x] Task: Create a basic `AgentConfig` structure that maps a persona (e.g., `@frontend`) to a specific executable command (e.g., `gemini-cli`).

## Phase 2: Orchestrator Integration
- [x] Task: Connect the `CommandRunner` into the Orchestrator Engine's `Run` lifecycle.
- [x] Task: Implement logic to compile the final CLI arguments. For example, if the task is "Build login button", the runner should construct: `gemini-cli --prompt "Build login button"`.
- [x] Task: Capture `stdout` and `stderr` line-by-line so the command output can be streamed in real-time as the agent works.

## Phase 3: WebSocket Server
- [x] Task: Add the `gorilla/websocket` dependency to the Go backend.
- [x] Task: Create a WebSocket handler endpoint `GET /api/projects/:id/ws`.
- [x] Task: Implement a broadcast hub in the Go daemon that allows clients to subscribe to a specific project's execution logs.

## Phase 4: Frontend Integration & Streaming Logs
- [x] Task: In the Vite frontend, update the `ProjectView` to establish a WebSocket connection when the component mounts.
- [x] Task: Create a `Terminal` or `LogViewer` Shadcn component on the project page.
- [x] Task: As the Go `CommandRunner` reads lines from the agent's `stdout`/`stderr`, broadcast them over the WebSocket, and render them in the frontend `LogViewer` in real-time.
