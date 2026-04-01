# Implementation Plan - Frontend Migration to Convex-Backed Data Flows

## Phase 1: Audit and Migration Boundaries

- [ ] Task: Inventory frontend hooks/components that consume legacy Go API routes and websocket streams
  - Sub-item: Map each to target Convex function(s) or Bun bridge endpoints
- [ ] Task: Define adapter boundary strategy for mixed migration period
  - Sub-item: Document how to switch per-page/per-hook without cross-contamination

## Phase 2: Core Data Hook Migration

- [ ] Task: Implement Convex-backed data hooks for project registry/list operations in `frontend/src/lib`
  - Sub-item: Ensure create/update flows use Convex-backed mutation paths
- [ ] Task: Migrate one additional slice hook set (tracks/tasks or execution logs)
  - Sub-item: Maintain backward compatibility for untouched pages

## Phase 3: Realtime Flow Migration

- [ ] Task: Replace one websocket-driven UI update path with Convex subscription-driven updates
  - Sub-item: Validate live updates for add/change events in the migrated page
- [ ] Task: Remove or isolate legacy websocket coupling in migrated components
  - Sub-item: Keep non-migrated pages functional during transition

## Phase 4: Test and Verification

- [ ] Task: Add/update frontend tests for migrated hooks/components
  - Sub-item: Assert data render + mutation + live update behavior
- [ ] Task: Run frontend validation commands and capture results
  - Sub-item: `cd frontend && npm test && npm run build`

## Phase 5: Migration Reporting

- [ ] Task: Record migrated vs remaining pages/hooks in track notes or plan evidence section
  - Sub-item: Explicitly list remaining legacy dependencies for next track handoff
