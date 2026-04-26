# Specification - Go Backend - CLI Runner & WebSocket Streaming

## 1. Goal
Provide the mechanical execution layer for the Orchestrator Engine. This track handles physically spawning external AI CLI tools (like `gemini-cli`), capturing their standard output in real-time, and piping that output to the frontend UI so the human user can watch the agent work.

## 2. Context
Once the Orchestrator Engine (from the previous track) decides *what* to do, the `CommandRunner` decides *how* to do it. The user needs transparency into what the AI agent is currently doing in the background. Simply waiting for a task to jump from "In Progress" to "Done" provides a poor user experience, especially since agent runs can take minutes.

## 3. Architecture & Data Flow
1. **Command Execution (`os/exec`):** 
   - The runner takes an `AgentConfig` and a `Task` description.
   - It formats the command (e.g., `gemini-cli --prompt "Task description"`).
   - It executes the command in the context of the target project's root directory (`Project.Path`).
2. **I/O Capture:**
   - It attaches to the command's `Stdout` and `Stderr`.
   - It reads output line-by-line using a `bufio.Scanner`.
3. **WebSocket Broadcast (`gorilla/websocket`):**
   - The Go daemon maintains a pool of active WebSocket connections, bucketed by `projectID`.
   - As lines are read from the `CommandRunner`, they are broadcast to all clients subscribed to that project's log stream.
4. **Frontend Rendering:**
   - The React frontend establishes a WebSocket connection.
   - Incoming messages are appended to a state array and rendered in a scrolling terminal-like UI component.

## 4. Edge Cases & Security
- **Timeouts:** Agents can hang. The `CommandRunner` must use a context with a timeout or allow manual cancellation via the UI. If cancelled, it must send a `SIGKILL` to the child process.
- **Zombie Processes:** Ensure that if the Go daemon crashes, any child `gemini-cli` processes are cleaned up (this can be tricky, might require process group management).