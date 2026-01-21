# Plan

## Phase 1: UI Cleanup + Remove Status/Logs [checkpoint: b956173]
- [x] Task: Remove walking skeleton copy and status/log widgets from renderer (ee5f749)
  - [x] Write/update renderer tests to assert removed UI elements are no longer rendered
  - [x] Remove walking skeleton copy and delete System Status/Database Logs/IPC Test cards from layout
- [x] Task: Remove system status + database log IPC/backing logic (f24db71)
  - [x] Write/update main/renderer tests to ensure IPC handlers and client calls are removed safely
  - [x] Remove get-system-status/get-db-logs IPC handlers and related renderer state/hooks
- [x] Task: Conductor - User Manual Verification 'Phase 1: UI Cleanup + Remove Status/Logs' (Protocol in workflow.md)

## Phase 2: File Menu Project Access + Recent Projects [checkpoint: 28618a2]
- [x] Task: Add recent projects persistence (limit 5) (9c1d09e)
  - [x] Write unit tests for persistence: append, dedupe, trim to 5, return most-recent-first
  - [x] Implement recent projects storage alongside existing last-project persistence
- [x] Task: Add File menu actions for Open Project and Open Recent (464c6ff)
  - [x] Write main-process tests for menu action wiring and recent list population
  - [x] Implement File menu with “Open Project…” and “Open Recent” (5 items) and connect to load flow
- [x] Task: Wire menu-driven project loading + remove Board loader (3a1fe61)
  - [x] Write renderer tests for Board tab without loader and for menu-triggered project load
  - [x] Remove Project Loader panel and handle menu-initiated project loading updates in UI state
- [x] Task: Conductor - User Manual Verification 'Phase 2: File Menu Project Access + Recent Projects' (Protocol in workflow.md)

## Phase 3: Terminal Pane + Logs Stream
- [x] Task: Define terminal implementation and update tech stack (0ec26a9)
  - [ ] Document chosen terminal stack (e.g., xterm.js + node-pty) in tech-stack.md before implementation
- [ ] Task: Add terminal sessions UI with tabs
  - [ ] Write renderer tests for Terminal tab layout, tab switching, and session list
  - [ ] Implement renderer Terminal UI with multiple terminal sessions
- [ ] Task: Implement terminal backend for project-root sessions
  - [ ] Write main-process tests for terminal session lifecycle and command execution routing
  - [ ] Implement main/preload IPC bridge to spawn and manage terminal sessions
- [ ] Task: Add Logs tab streaming app logs
  - [ ] Write tests for log stream IPC and renderer log view updates
  - [ ] Implement log capture (main + renderer) and stream into Logs tab
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Terminal Pane + Logs Stream' (Protocol in workflow.md)
