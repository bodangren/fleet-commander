# Specification - Agent Scheduling & Execution Timing

## Overview

This track enables users to schedule agent task execution with various timing modes: one-time (with optional delay), interval-based (cron-style), and continuous loop (while) execution.

## Functional Requirements

### 1. Scheduling Configuration UI

- Each task with an assigned agent shall display scheduling options.
- Scheduling modes:
  - **One-time**: Run once immediately or with a configurable delay.
  - **Interval (Cron)**: Run repeatedly at specified intervals using cron-style syntax or a simplified picker.
  - **Loop (While)**: Run continuously in a loop with a configurable delay between iterations.
- Users can set the delay/interval value and unit (seconds, minutes, hours).

### 2. Schedule State Display

- Scheduled tasks show their current status: `pending`, `running`, `paused`, `completed`.
- Display next execution time for scheduled runs.
- Provide controls: Pause/Resume/Cancel for active schedules.

### 3. Execution Engine

- Implement a scheduler service in the main process to manage timed executions.
- Support multiple concurrent scheduled tasks.
- Handle app restart: persist scheduled state and restore on launch.

## Non-Functional Requirements

- **Reliability**: Scheduled tasks must execute at the specified times within a reasonable tolerance.
- **Persistence**: Schedule configurations persist in the plan.md or a dedicated config file.

## Acceptance Criteria

- [ ] Users can select scheduling mode (one-time, interval, loop) for a task.
- [ ] One-time execution with delay works correctly.
- [ ] Interval execution runs at specified intervals.
- [ ] Loop execution runs continuously with configurable delay.
- [ ] Next execution time is displayed for scheduled tasks.
- [ ] Pause/Resume/Cancel controls work correctly.
- [ ] Scheduled state persists across app restarts.

## Out of Scope

- Complex cron expressions (use simplified interval picker).
- Distributed scheduling (single-machine only).
- Task dependencies/chaining.
