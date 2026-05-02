# Specification: Dispatch Scoring v2

## Overview

Fix hidden biases and hardcoded values in the dispatch scoring engine identified in the 2026-05-01 architecture review. `starvationBonus` uses `task.updatedAt` (any change) instead of `lastDispatchAttemptAt`, causing tasks repeatedly rejected to not age properly. `epsilon` tie-breaker (0.1) is arbitrary. `expectedCost` naming is counterintuitive (stores 1 - cost).

## Functional Requirements

### 1. Fix Starvation Scoring

- Add `lastDispatchAttemptAt` field to tasks table
- Update starvation bonus calculation to use `lastDispatchAttemptAt` instead of `updatedAt`
- Set `lastDispatchAttemptAt` on every dispatch attempt (even if task not selected)
- Update task queries to include the new field
- Backfill existing tasks with `updatedAt` as initial value

### 2. Make Scoring Configurable

- Add `epsilon` to Convex settings table (default: 0.1)
- Add weight overrides per project (priorityWeight, fitWeight, costWeight)
- Update `selectBestCandidate` to read settings before applying defaults
- Add settings UI for weight configuration
- Validate weight sums to reasonable range

### 3. Add Scoring Telemetry

- Log score breakdown for each candidate during dispatch
- Store detailed scoring telemetry in new `scoreTelemetry` table or extend `scoreAudit`
- Include: candidate task key, raw scores, weights applied, final score, justification
- Add query to retrieve scoring history by task or time range
- Add endpoint to export scoring data for analysis

### 4. Fix expectedCost Naming

- Rename `expectedCost` to `costScore` or `inverseCost` to reflect actual meaning
- Update all references in codebase
- Ensure backward compatibility during transition

## Non-Functional Requirements

- Scoring changes must not break existing task ordering significantly
- Telemetry must not impact dispatch performance (< 10ms overhead)
- Settings changes must take effect without server restart
- All changes backward compatible with existing data

## Acceptance Criteria

- [ ] `lastDispatchAttemptAt` field added to tasks
- [ ] Starvation bonus uses `lastDispatchAttemptAt`
- [ ] Field set on every dispatch attempt
- [ ] `epsilon` configurable via Convex settings
- [ ] Weight overrides configurable per project
- [ ] Scoring telemetry logged and queryable
- [ ] `expectedCost` renamed to intuitive name
- [ ] All existing tests pass
- [ ] New tests cover starvation and configuration

## Out of Scope

- ML-based scoring optimization (future track)
- Real-time scoring dashboard (Phase 6)
- Cross-project scoring comparison
