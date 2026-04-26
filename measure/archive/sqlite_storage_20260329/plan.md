# Implementation Plan - SQLite Storage Layer

## Phase 1: Schema & Setup

- [x] Task: Define SQLite schema (DDL)
  - [x] CREATE TABLE statements for all entities
  - [x] Indexes for common queries
  - [x] Foreign key constraints

- [x] Task: Implement database connection
  - [x] NewStore() constructor
  - [x] Auto-migration on startup
  - [x] Connection pooling

## Phase 2: Entity Stores

- [x] Task: Implement ProjectStore
  - [x] CRUD operations
  - [x] ListAll, GetByID

- [x] Task: Implement TaskStore  
  - [x] CRUD operations
  - [x] ListByTrack, ListByStatus

- [x] Task: Implement IssueStore
  - [x] CRUD operations
  - [x] ListByStatus, ListByProject

- [x] Task: Implement ExecutionLogStore
  - [x] Insert log entry
  - [x] ListByProject with filters
  - [x] Stats aggregation queries

## Phase 3: File Sync

- [x] Task: Implement file write on state change
  - [x] Write plan.md on task updates
  - [x] Write issue markdown on issue changes

- [x] Task: Implement file read on startup
  - [x] Parse existing markdown files
  - [x] Insert into SQLite on initial load

## Phase 4: Integration

- [ ] Task: Wire stores into API handlers (TODO - can wire later)
  - [ ] Replace direct file reads with SQLite queries
  - [ ] Ensure file sync triggers on writes

## Phase 5: Verification

- [x] Task: Run all tests and verify build
- [x] Task: Verify file sync works correctly