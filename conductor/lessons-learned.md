# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

## Architecture & Design

- (2026-01-20, scaffold_project) Electron chosen for native file system access and folder selector capabilities
- (2026-01-21, terminal_stack) xterm.js in renderer with IPC bridge to node-pty sessions in main process
- (2026-03-13, llm_agent) Agent templates stored in settings; agent selection persisted via @tag in plan.md

## Recurring Gotchas

- (2026-01-20, kanban_board) DevTools not available in Electron app; manual verification must avoid DevTools usage
- (2026-03-13, llm_agent) Placeholder replacement must handle both single and double quote wrapping

## Patterns That Worked Well

- (2026-01-19, scaffold_project) Vite + Electron integration using vite-plugin-electron for fast HMR
- (2026-03-13, llm_agent) IPC handlers for spawning PTY with pre-written commands enables agent execution flow

## Planning Improvements

- None yet
