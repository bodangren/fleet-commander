# Tech Stack - Conductor Fleet Commander

To support heavy concurrency, robust child process management, and rapid cross-project file watching, the application utilizes a **Go Daemon + Vite Frontend** architecture.

## 1. Backend: The Orchestration Daemon (Go)
The core of the application is a lightweight, compiled Go binary that runs in the background.

- **Language:** Go (1.22+)
- **Concurrency:** Goroutines and Channels are used to manage multiple simultaneous child CLI processes and coordinate state changes without race conditions.
- **Process Management:** `os/exec` for spawning CLI agents (e.g., `gemini-cli`, `claude`), capturing `stdout`/`stderr` pipes, and sending precise OS signals (`SIGINT`, `SIGKILL`) for graceful or hard termination.
- **File System Watching:** `fsnotify` for highly efficient, low-overhead monitoring of the `conductor/` directories across all registered projects to trigger state updates (e.g., when an agent checks off a task or opens an issue).
- **Web Server:** Standard `net/http` to serve the static frontend assets and provide an API.
- **Real-time Comms:** WebSockets (via `gorilla/websocket` or standard library) to stream process logs and state changes instantly to the UI.
- **Local Database:** Embedded SQLite (via `mattn/go-sqlite3`) or a simple flat JSON file to store global application state (registered projects, agent personas, global settings).

## 2. Frontend: The Control Center (Web)
The user interface is served by the Go daemon and runs in any modern browser.

- **Framework:** React (via Vite)
- **Styling:** Tailwind CSS + Shadcn UI (Radix primitives) for a clean, dense, "developer tool" aesthetic.
- **Routing:** React Router for navigating between the Global Dashboard and individual Project Control Rooms.
- **State Management:** Zustand or React Context for local state, tightly coupled to WebSocket events pushing the global state from the Go backend.
- **Terminal Emulator (Optional but Recommended):** `xterm.js` to render live output streams from the running agents, simulating a real terminal view inside the browser.

## 3. The Agents (External CLIs)
The daemon does not inherently contain the LLM logic; it orchestrates external tools.
- Compatible tools: `gemini-cli`, `claude code`, `aider`, `opencode`, or any custom bash script that accepts a prompt and context via command-line arguments.

## Why this Stack?
- **Stability:** Go handles concurrent file I/O and process execution vastly better than Node.js event loops.
- **Local-First Resilience:** Running as a background daemon means the UI can be closed without interrupting long-running agent tasks.
- **No Heavy Desktop Frameworks:** Avoiding Electron/Tauri keeps the build simple and leverages standard web-app paradigms for complex dashboards.
