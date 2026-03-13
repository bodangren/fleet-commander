# Implementation Plan - Agent Scheduling & Execution Timing

## Phase 1: Scheduling Data Model & Persistence

Define the data structures and persistence layer for schedule configurations.

- [x] Task: Define schedule configuration types and Zod schemas 95e547a
  - [x] Write unit tests for schedule config parsing and validation
  - [x] Create types for ScheduleMode, ScheduleConfig, and ScheduleState
- [x] Task: Persist schedule config in plan.md task metadata
  - [x] Write tests for reading/writing schedule config from plan.md
  - [x] Update plan parser to extract schedule config from task lines
- [x] Task: Conductor - User Manual Verification 'Phase 1: Scheduling Data Model & Persistence'

## Phase 2: Scheduler Service (Main Process)

Implement the core scheduling engine in the main process.

- [x] Task: Create SchedulerService class with interval/loop execution 6f24ece
  - [x] Write unit tests for scheduler timing logic
  - [x] Implement setTimeout/setInterval-based execution with cancellation
- [x] Task: Add IPC handlers for schedule control (start/pause/resume/cancel) 7c2e663
  - [x] Write tests for IPC handlers
  - [x] Implement handlers that delegate to SchedulerService
- [x] Task: Persist active schedules and restore on app restart
  - [x] Write tests for schedule persistence and restoration
  - [x] Save active schedules to a JSON file and reload on startup
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Scheduler Service'

## Phase 3: UI for Scheduling Controls

Add scheduling UI components and integrate with the scheduler service.

- [ ] Task: Add scheduling mode selector to PlanDetailPanel
  - [ ] Write UI tests for scheduling mode dropdown
  - [ ] Implement dropdown with one-time/interval/loop options
- [ ] Task: Add delay/interval input fields
  - [ ] Write UI tests for delay input validation
  - [ ] Implement number input with unit selector (seconds/minutes/hours)
- [ ] Task: Display schedule status and next execution time
  - [ ] Write UI tests for status display
  - [ ] Show pending/running/paused status and countdown
- [ ] Task: Add Pause/Resume/Cancel controls
  - [ ] Write UI tests for control buttons
  - [ ] Implement buttons that call IPC handlers
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI for Scheduling Controls'
