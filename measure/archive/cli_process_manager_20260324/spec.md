# Specification: CLI Process Manager & Execution Engine

## Overview
The daemon needs the ability to spawn, monitor, and manage external CLI tools (the AI Agents). This requires robust subprocess management to ensure agents can be started, stopped, and their output streamed to the frontend.

## Goals
- Implement a `ProcessManager` in Go using `os/exec`.
- Define an Agent configuration schema (mapping an `@agent` tag to a specific shell command, like `gemini-cli --model gemini-2.5-pro`).
- Capture `stdout` and `stderr` from the running CLI and broadcast it via WebSockets.
- Implement process control (kill/cancel).

## Acceptance Criteria
- When a task is "Started" via API, the daemon spawns the correct CLI tool based on the agent tag.
- The UI can connect via WebSocket and see the live terminal output of the AI agent.
- If the human user clicks "Cancel" in the UI, the Go daemon sends a `SIGINT`/`SIGKILL` and successfully terminates the child process.
