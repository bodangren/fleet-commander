# Implementation Plan: Frontend Stability

## Phase 1: Fix TD-030 (Hardcoded Scan Root)

- [ ] Task: Make scan root configurable
    - [ ] Add `SCAN_ROOT` env var support in frontend
    - [ ] Update `useFleetData.ts` to use config-driven path
    - [ ] Add API endpoint to get server-side default
    - [ ] Validate scan root exists and is readable

- [ ] Task: Update workspace scanner
    - [ ] Use configured path in scanner
    - [ ] Handle missing/invalid path gracefully
    - [ ] Write tests for config-driven path

## Phase 2: Fix Log Stream Project Selection

- [ ] Task: Add project selector
    - [ ] Add explicit project selector to log stream UI
    - [ ] Remove auto-pick first project behavior
    - [ ] Show "No project selected" state
    - [ ] Persist selection in URL or localStorage

- [ ] Task: Handle edge cases
    - [ ] Handle no projects available state
    - [ ] Handle project deletion (reset selection)
    - [ ] Write tests for project selection

## Phase 3: Add Convex Error Handling

- [ ] Task: Add error boundary
    - [ ] Create error boundary component for Convex failures
    - [ ] Wrap ConvexProvider with error boundary
    - [ ] Show fallback UI on subscription failure

- [ ] Task: Add retry logic
    - [ ] Implement exponential backoff for failed subscriptions
    - [ ] Add retry button to fallback UI
    - [ ] Add offline indicator in app header
    - [ ] Write tests for error states

## Phase 4: Clean Up Unused Code

- [ ] Task: Remove unused WebSocket code
    - [ ] Audit `server.ts` for unused WebSocket handlers
    - [ ] Remove dead code or implement log streaming
    - [ ] Clean up related types and utilities

## Phase 5: Final Verification

- [ ] Task: Run tests and verify
    - [ ] Run all frontend tests
    - [ ] Run type checks
    - [ ] Verify error states render correctly
    - [ ] Test project selection flow
