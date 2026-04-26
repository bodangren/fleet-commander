# Specification - Workspace Auto-Discovery & Persistence

## 1. Goal
Provide a seamless onboarding experience for Fleet Commander users by allowing the Go backend to automatically discover local projects and persist this state across daemon restarts.

## 2. Context
Currently, the `ProjectManager` holds registered projects only in memory. When the Go daemon restarts, the user loses their dashboard state and file watchers disconnect. Furthermore, forcing the user to manually type in the absolute path for every single project they want to manage is tedious. 

We need to persist the list of registered projects to disk and provide an API that allows the frontend to request a scan of a generic "Workspace Root" (like `~/Desktop`) to find all projects that have a `measure/` directory setup.

## 3. Architecture & Data Flow
1. **Config Manager:** A new package `internal/config` will handle reading/writing a `~/.measure/projects.json` file.
2. **Scanner:** A new package `internal/scanner` will contain a recursive file system walking function. To prevent it from hanging on massive directories (like `node_modules` or `.git`), the scanner must ignore common large/hidden directories and have a reasonable depth limit.
3. **API Integration:**
   - `POST /api/projects/scan`: Triggers the scanner and returns potential paths.
   - `POST /api/projects`: Will be updated to take the selected paths, register them in memory, append them to `projects.json`, and bootstrap their `fsnotify` watchers.

## 4. Edge Cases & Considerations
- **Non-existent Paths:** If `projects.json` contains a path that has since been deleted from the filesystem, the Go daemon should gracefully ignore it on startup rather than crashing.
- **Scanner Performance:** The recursive scanner must skip `.git`, `node_modules`, `dist`, `build`, etc., to ensure the scan completes in milliseconds, not minutes.
