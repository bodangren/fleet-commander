# Implementation Plan - Automated Backup & Restore

## Phase 1: Backup Engine

- [x] Task: Implement zip archive creation utility
  - Accept a source directory path and destination zip path
  - Recursively add all files preserving relative directory structure
  - Include a `manifest.json` with backup timestamp, version, project name, and file count
  - Write test: creating a backup of a sample directory produces a valid zip with correct contents and manifest
- [x] Task: Implement project-level backup
  - Locate project conductor directory from `projects.json` registry
  - Zip the conductor directory and write to `~/.conductor/backups/` with timestamped filename
  - Write test: `CreateProjectBackup("myapp")` produces zip containing expected files
- [x] Task: Implement full system backup
  - Zip entire `~/.conductor/` directory excluding `backups/` to avoid recursion
  - Write test: `CreateFullBackup()` produces zip containing config.json, projects.json, and project dirs

## Phase 2: Restore Engine

- [x] Task: Implement zip extraction and restore
  - Extract zip to a target directory, validating manifest.json exists
  - Update `projects.json` registry with restored project paths
  - Write test: extracting a project backup restores files and updates registry
- [x] Task: Implement conflict handling for existing projects
  - Detect when restored project already exists; prompt for overwrite/skip/rename
  - Write test: restoring over existing project with `--force` overwrites, without flag returns conflict error

## Phase 3: CLI Commands and API Endpoints

- [x] Task: Add `conductor backup create` CLI command
  - Flags: `--project <name>`, `--full`, `--output <path>`
  - Print backup file path and size on success
- [x] Task: Add `conductor backup restore` CLI command
  - Flags: `<backup-file>`, `--force`, `--target <dir>`
  - Print restored files list on success
- [x] Task: Add API endpoints for backup operations
  - `POST /api/backup/create` with JSON body `{ "project": "name" | "full": true }`
  - `GET /api/backup/list` returns available backups

## Phase 4: Scheduled Backups

- [x] Task: Implement backup scheduler goroutine
  - Read `backup.interval` from config (default "24h")
  - Spawn a goroutine with `time.Ticker` that triggers full backups
- [x] Task: Implement backup rotation
  - List backup files sorted by modification time
  - Delete oldest backups beyond `backup.keep` count (default 10)
- [x] Task: Add config keys for backup settings
  - `backup.enabled`, `backup.interval`, `backup.keep`
  - Wire into config loading in `internal/config/`

## Phase 5: Verification

- [x] Task: Run `npm run lint` and `npm run test` across all new code
- [ ] Task: Manual verification: create backup, delete project, restore, verify project reappears
- [x] Task: Update `conductor/tracks/automated_backup_restore_20260330/plan.md` to mark phases complete
