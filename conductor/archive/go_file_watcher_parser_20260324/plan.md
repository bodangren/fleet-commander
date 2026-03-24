# Implementation Plan - Core Engine & Parser

## Phase 1: Models & Registry
- [x] Task: Create `models/` package defining `Project`, `Track`, `Phase`, and `Task` structs.
- [x] Task: Create a `ProjectManager` service to store a list of registered local project paths (in memory or a simple JSON file).

## Phase 2: Markdown Parsing
- [x] Task: Write `ParseTracksRegistry` function to convert `tracks.md` into a list of `Track` objects.
- [x] Task: Write `ParsePlan` function to parse `plan.md` into `Phase` and `Task` objects.
  - [x] Support identifying the task status (`[ ]`, `[x]`, `[~]`).
  - [x] Extract agent mentions (e.g., `@frontend`) via regex.

## Phase 3: File System Watcher
- [x] Task: Integrate `github.com/fsnotify/fsnotify`.
- [x] Task: Create a `WatcherService` that registers all active project `conductor/` directories.
- [x] Task: On file modification event, trigger the parser for the modified file and update the in-memory state.

## Phase 4: Data API
- [x] Task: Create REST endpoints (`/api/projects`, `/api/projects/:id`) to serve the parsed models to the Vite frontend.
