# Specification - Automated Backup & Restore

## Overview

Implement a backup and restore system for Fleet Commander that creates portable zip bundles of project data and the full `~/.measure/` directory. Support manual backups via CLI and API, scheduled automatic backups with configurable intervals, backup rotation to manage disk space, and project export for sharing between Fleet Commander instances.

## Functional Requirements

- **FR1:** Backup command (`measure backup create`) creates a zip archive of a project's `measure/` directory including plan.md, tracks.md, issues.jsonl, and execution logs.
- **FR2:** Full system backup captures the entire `~/.measure/` directory including config, project registry, SQLite database, and all project directories.
- **FR3:** Restore command (`measure backup restore <file>`) unpacks a backup zip and re-registers projects in `projects.json`.
- **FR4:** Scheduled automatic backups running at a configurable interval (default 24 hours) with configurable backup destination.
- **FR5:** Backup rotation keeping the last N backups (default 10) and deleting older archives automatically.
- **FR6:** Project export (`measure export <project>`) creates a self-contained zip for sharing a single project between Fleet Commander instances.

## Acceptance Criteria

1. `measure backup create --project myapp` produces a zip file containing `plan.md`, `tracks.md`, `issues.jsonl`, and `execution_log.jsonl` from the project's measure directory.
2. `measure backup create --full` produces a zip of the entire `~/.measure/` directory tree.
3. `measure backup restore backup.zip` unpacks files, updates `projects.json`, and the restored project appears in `measure status` output.
4. Setting `backup.interval = "6h"` in config triggers automatic backups every 6 hours.
5. With `backup.keep = 5`, only the 5 most recent backups remain in the backup directory after rotation.
6. `measure export myapp` produces a zip that another Fleet Commander instance can import with `measure import`.

## Out of Scope

- Incremental or differential backups.
- Cloud storage backends (S3, GCS).
- Backup encryption.
- Remote restore or push-based replication between instances.
