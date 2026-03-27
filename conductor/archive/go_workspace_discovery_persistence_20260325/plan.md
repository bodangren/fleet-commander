# Implementation Plan - Workspace Auto-Discovery & Persistence

## Phase 1: Data Persistence
- [x] Task: Create a `config/` package and a `ConfigManager` service.
- [x] Task: Implement logic to read/write a `projects.json` file in a global configuration directory (e.g., `~/.conductor/projects.json`).
- [x] Task: Update the `main.go` startup sequence to load `projects.json` via `ConfigManager` and populate the in-memory `ProjectManager`.

## Phase 2: Directory Auto-Discovery
- [x] Task: Create a `scanner/` package.
- [x] Task: Implement a recursive directory scanner `FindConductorProjects(rootDir string) []string` that searches for subdirectories containing a `conductor/` folder. Limit recursion depth for performance.
- [x] Task: Create a new REST endpoint `POST /api/projects/scan` that accepts a `rootDir` path, runs the scanner, and returns the discovered project paths.

## Phase 3: Registration & Watcher Hookup
- [x] Task: Update the existing `POST /api/projects` endpoint (or create a new one) to accept an array of discovered paths, register them via `ProjectManager`, and save the updated list to `projects.json`.
- [x] Task: Ensure the `WatcherService` is automatically hooked up to start monitoring the new `conductor/` directories upon registration.
