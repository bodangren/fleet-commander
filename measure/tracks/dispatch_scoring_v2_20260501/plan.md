# Implementation Plan: Dispatch Scoring v2

## Phase 1: Fix Starvation Scoring

- [ ] Task: Add lastDispatchAttemptAt field
    - [ ] Add `lastDispatchAttemptAt` to tasks table in schema
    - [ ] Update task type definitions
    - [ ] Backfill existing tasks with `updatedAt` as initial value
    - [ ] Update queries to include new field

- [ ] Task: Update starvation bonus calculation
    - [ ] Modify `selectBestCandidate` to use `lastDispatchAttemptAt`
    - [ ] Update task queries to set field on dispatch attempt
    - [ ] Ensure field updated even for rejected tasks
    - [ ] Write tests for starvation calculation

## Phase 2: Make Scoring Configurable

- [ ] Task: Add scoring settings
    - [ ] Add `epsilon` to Convex settings (default: 0.1)
    - [ ] Add weight settings: priorityWeight, fitWeight, costWeight
    - [ ] Support per-project weight overrides
    - [ ] Validate weight values

- [ ] Task: Update scoring engine
    - [ ] Modify `selectBestCandidate` to read settings
    - [ ] Apply project-specific weights when available
    - [ ] Fall back to defaults if no settings found
    - [ ] Write tests for configuration

## Phase 3: Add Scoring Telemetry

- [ ] Task: Create telemetry logging
    - [ ] Log score breakdown for each candidate
    - [ ] Include raw scores, weights, final score, justification
    - [ ] Store in `scoreAudit` table or extend schema

- [ ] Task: Add query endpoints
    - [ ] Create query to retrieve scoring history by task
    - [ ] Create query to retrieve scoring history by time range
    - [ ] Write tests for telemetry persistence

## Phase 4: Fix expectedCost Naming

- [ ] Task: Rename field
    - [ ] Rename `expectedCost` to `costScore` in codebase
    - [ ] Update all references in scoring engine
    - [ ] Update tests and documentation
    - [ ] Ensure backward compatibility

## Phase 5: Final Verification

- [ ] Task: Run tests and verify
    - [ ] Run all pivot tests
    - [ ] Verify scoring behavior unchanged for default config
    - [ ] Test configuration overrides
    - [ ] Verify telemetry logged correctly
