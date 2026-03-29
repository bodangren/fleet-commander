# Specification - SQLite Storage Layer

## Overview

Primary data storage in SQLite for fast queries, with file system sync for state persistence and portability. SQLite is the source of truth; markdown files are written on state changes.

## Functional Requirements

### FR1: SQLite Schema
- Projects table: id, name, path, lastUpdated
- Tracks table: id, projectId, name, type, status, planPath
- Tasks table: id, trackId, phase, description, status, agentTag, createdAt
- Issues table: id, projectId, title, description, type, status, relatedTask, createdAt, updatedAt
- ExecutionLogs table: id, projectId, taskId, agentName, status, durationMs, timestamp

### FR2: SQLite Store Implementation
- Implement stores with Get, List, Save, Delete operations
- Auto-create tables on startup
- File sync: write markdown on state changes
- Read from SQLite for API responses

### FR3: File Fallback
- On startup, load state from markdown files
- Detect changes and resync if needed
- Export to markdown on demand

## Acceptance Criteria

1. All entities stored in SQLite
2. File sync writes markdown files on changes
3. API reads from SQLite (fast)
4. File fallback loads on startup

## Out of Scope

- Migration tool for existing projects (tracked separately)
- Real-time file watching + SQLite update (tracked separately)