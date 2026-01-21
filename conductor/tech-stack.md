# Tech Stack - Conductor Command Center

## Desktop & Runtime
- **Wrapper:** Electron (provides native file system access and "Folder Selector" capabilities).
- **Main Process:** Node.js for executing CLI agents and managing the database.
- **Communication:** Electron IPC for secure bridge between UI and Node.js.

## Frontend (Renderer)
- **Framework:** React (Vite-based) for a fast, reactive UI.
- **Styling:** Tailwind CSS + Shadcn UI (accessible, modern developer-focused components).
- **Board Logic:** Native HTML5 drag-and-drop (current) for Kanban interactions.
- **Deviation Note (2026-01-20):** `@hello-pangea/dnd` not yet integrated; revisit if richer DnD is needed.
- **Terminal:** `xterm.js` for the frontend terminal emulator interface.
- **Terminal Stack Note (2026-01-21):** Use `xterm.js` in the renderer with an IPC bridge to `node-pty` sessions in the main process.

## Backend & Logic
- **Database:** `better-sqlite3` for high-performance persistence of project history and agent mappings.
- **Terminal Sessions:** `node-pty` to manage persistent, interactive pseudo-terminal sessions on the backend.
- **App Logs Streaming:** Internal logger wraps `console` in main/renderer and forwards entries over IPC (no third-party logging library).
- **File System:** Node `fs` for real-time bi-directional sync with `conductor/*.md` files.

## Development Standards
- **Language:** TypeScript for end-to-end type safety (especially across IPC).
- **Package Manager:** npm.
