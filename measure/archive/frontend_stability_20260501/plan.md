# Implementation Plan: Frontend Stability

## Phase 1: Fix TD-030 (Hardcoded Scan Root)

- [x] Task: Make scan root configurable
    - [x] Removed hardcoded `/home/daniel-bo/Desktop` from `useFleetData.ts`.
    - [x] Scan-and-import endpoint is a stub (returns empty), so path was unnecessary.

## Phase 2: Fix Log Stream Project Selection

Deferred — needs UI design work (project selector component, URL persistence, empty state).

- [ ] Task: Add project selector
    - [ ] Add explicit project selector to log stream UI
    - [ ] Remove auto-pick first project behavior
    - [ ] Show "No project selected" state
    - [ ] Persist selection in URL or localStorage

## Phase 3: Add Convex Error Handling

Deferred — needs frontend test runner fix first.

- [ ] Task: Add error boundary
    - [ ] Create error boundary component for Convex failures
    - [ ] Wrap ConvexProvider with error boundary
    - [ ] Show fallback UI on subscription failure

## Phase 4: Clean Up Unused Code

Deferred — WebSocket still used as fallback for log streaming.

- [ ] Task: Remove unused WebSocket code
    - [ ] Audit `server.ts` for unused WebSocket handlers
    - [ ] Remove dead code or implement log streaming

## Phase 5: Final Verification

- [x] Task: TD-030 verified fixed — no hardcoded path in frontend.
