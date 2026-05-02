# Specification: Frontend Stability

## Overview

Fix critical frontend fragility issues identified in the 2026-05-01 architecture review and tech debt registry. `useFleetData.ts:67` hardcodes `/home/daniel-bo/Desktop` as scan root (TD-030). `useLogStream` connects to arbitrary first project. No error handling for Convex subscription failures.

## Functional Requirements

### 1. Fix TD-030: Hardcoded Scan Root

- Replace hardcoded `/home/daniel-bo/Desktop` in `useFleetData.ts` with config-driven path
- Add `SCAN_ROOT` environment variable support
- Fall back to server-side default or user home directory
- Update workspace scanner to use configured path
- Add validation that scan root exists and is readable

### 2. Fix Log Stream Project Selection

- Add explicit project selector to log stream UI
- Remove auto-pick first project behavior
- Show "No project selected" state with selector prompt
- Persist selected project in URL or localStorage
- Handle project deletion gracefully (reset selection)

### 3. Add Convex Error Handling

- Add error boundary for subscription failures in `ConvexProvider`
- Implement retry with exponential backoff for failed subscriptions
- Show fallback UI when Convex is unreachable
- Display clear error message with retry button
- Add offline indicator in app header

### 4. Remove Unused WebSocket Code

- Audit `server.ts` for unused WebSocket handlers
- Remove dead code or implement actual log streaming
- Clean up related types and utilities

## Non-Functional Requirements

- Error boundaries must not crash the app
- Retry logic must not cause infinite loops
- UI must remain responsive during reconnection
- Changes must work with existing Convex hooks

## Acceptance Criteria

- [ ] Scan root is config-driven, not hardcoded
- [ ] Log stream requires explicit project selection
- [ ] Convex subscription failures show fallback UI
- [ ] Retry button reconnects to Convex
- [ ] Offline indicator visible in header
- [ ] Unused WebSocket code removed or implemented
- [ ] All existing frontend tests pass
- [ ] New tests cover error states

## Out of Scope

- Full offline mode (deferred to resilience track)
- Service Worker for offline caching (future)
- Real-time collaboration features
