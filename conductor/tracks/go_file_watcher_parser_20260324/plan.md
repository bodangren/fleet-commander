# Implementation Plan - Core Engine & Parser

## Phase 1: Models & Registry
- [ ] Task: Create `models/` package defining `Project`, `Track`, `Phase`, and `Task` structs.
- [ ] Task: Create a `ProjectManager` service to store a list of registered local project paths (in memory or a simple JSON file).

## Phase 2: Markdown Parsing
- [ ] Task: Write `ParseTracksRegistry` function to convert `tracks.md` into a list of `Track` objects.
- [ ] Task: Write `ParsePlan` function to parse `plan.md` into `Phase` and `Task` objects.
  - [ ] Support identifying the task status (`[ ]`, `[x]`, `[~]`).
  - [ ] Extract agent mentions (e.g., `@frontend`) via regex.

## Phase 3: File System Watcher
- [ ] Task: Integrate `github.com/fsnotify/fsnotify`.
- [ ] Task: Create a `WatcherService` that registers all active project `conductor/` directories.
- [ ] Task: On file modification event, trigger the parser for the modified file and update the in-memory state.

## Phase 4: Data API
- [ ] Task: Create REST endpoints (`/api/projects`, `/api/projects/:id`) to serve the parsed models to the Vite frontend.
