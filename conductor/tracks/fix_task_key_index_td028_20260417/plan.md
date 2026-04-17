# Implementation Plan - Fix Tasks Table Index TD-028

## Phase 1: Add Index to Schema

- [x] Add `.index("by_taskKey", ["taskKey"])` to `tasks` table in `convex/schema.ts`

## Phase 2: Add getTaskByTaskKey Query

- [x] Add `getTaskByTaskKey` query in `convex/fleetCatalog.ts` that uses `withIndex("by_taskKey")`
- [x] Write tests for the new query

## Phase 3: Update Existing Functions to Use Index

- [x] Update `upsertTask` mutation to use `getTaskByTaskKey` instead of scanning project+track results
- [x] Update `updateTaskStatus` mutation to use `getTaskByTaskKey` instead of scanning project results
- [x] Write tests for updated functions

## Phase 4: Verify

- [x] Run `npm run pivot:test` — all pass
- [x] Run `npm run check` on frontend — all pass
- [x] Commit checkpoint