# Specification: Core Go File Watcher & Markdown Parser

## Overview
The "spine" of the new architecture relies on watching the filesystem for changes across multiple registered projects and parsing Conductor markdown files (`tracks.md`, `plan.md`) into structured data.

## Goals
- Implement a global project registry to keep track of which directories the daemon is managing.
- Integrate `fsnotify` to watch the `conductor/` directory in each registered project.
- Write a Markdown parser to extract the Track data from `tracks.md` and the task states (`[ ]`, `[x]`, `[Blocked]`) from `plan.md`.
- Establish the Go data structures (Models) that will represent Projects, Tracks, Phases, and Tasks.

## Acceptance Criteria
- Go daemon successfully monitors a given folder for file modifications.
- When `conductor/tracks.md` or a `plan.md` file is manually edited, the daemon logs the parsed, updated state to the terminal.
- An API endpoint (e.g., `GET /api/projects/:id/board`) returns the parsed Kanban data as JSON.
