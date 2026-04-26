# Implementation Plan - Frontend Migration to Convex-Backed Data Flows

## Phase 1: Audit and Migration Boundaries

- [x] Task: Inventory frontend hooks/components that consume legacy Go API routes and websocket streams
  - Sub-item: Map each to target Convex function(s) or Bun bridge endpoints
  - Evidence: `measure/tracks/frontend_convex_migration_20260402/audit.md`
- [x] Task: Define adapter boundary strategy for mixed migration period
  - Sub-item: Document how to switch per-page/per-hook without cross-contamination
  - Evidence: `frontend/src/lib/dataAdapter.ts` (feature flags per slice)

## Phase 2: Core Data Hook Migration

- [x] Task: Implement Convex-backed data hooks for project registry/list operations in `frontend/src/lib`
  - Sub-item: Ensure create/update flows use Convex-backed mutation paths
  - Evidence: `frontend/src/lib/useConvexData.ts`, `frontend/src/lib/useFleetData.ts`
- [x] Task: Migrate one additional slice hook set (tracks/tasks or execution logs)
  - Sub-item: Maintain backward compatibility for untouched pages
  - Evidence: `useConvexTasks`, `useConvexIssues`, `useConvexLogs` hooks in `useConvexData.ts`

## Phase 3: Realtime Flow Migration

- [x] Task: Replace one websocket-driven UI update path with Convex subscription-driven updates
  - Sub-item: Validate live updates for add/change events in the migrated page
  - Evidence: `frontend/src/lib/useLogStream.ts` (unified hook with Convex subscription path)
- [x] Task: Remove or isolate legacy websocket coupling in migrated components
  - Sub-item: Keep non-migrated pages functional during transition
  - Evidence: `frontend/src/App.tsx` uses `useLogStream` instead of direct `useWebSocket`

## Phase 4: Test and Verification

- [x] Task: Add/update frontend tests for migrated hooks/components
  - Sub-item: Assert data render + mutation + live update behavior
  - Evidence: `frontend/src/lib/dataAdapter.test.ts`, `frontend/src/lib/useConvexData.test.ts`, `frontend/src/lib/useLogStream.test.ts`
- [x] Task: Run frontend validation commands and capture results
  - Sub-item: `cd frontend && bun run test && bun run build`
  - Evidence: 29 tests passing, build succeeds

## Phase 5: Migration Reporting

- [x] Task: Record migrated vs remaining pages/hooks in track notes or plan evidence section
  - Sub-item: Explicitly list remaining legacy dependencies for next track handoff
  - Evidence: `measure/tracks/frontend_convex_migration_20260402/migration-report.md`
