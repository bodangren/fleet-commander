# Track: Daily Cleanup 2026-04-05

**Type:** chore  
**Status:** [x] Complete  
**Created:** 2026-04-05  
**Priority:** High  

## Summary

Daily refactor/cleanup of previous day's work. Fixes TypeScript errors in pivot codebase, removes dead code, cleans stale Electron references, and removes debug leftovers.

## Tasks

- [x] **T1: Fix TypeScript errors in pivot test files**
  - Fix mock signature mismatches in `orchestrator.test.ts` (cast mockImplementation)
  - Add missing `parallel` property in `pipeline/runner.test.ts` step objects
  - Fix `failureType` and `status` literal types with `as const`
  - Fix unsafe type assertions for mock call arguments
  - Commit: `2cbe4ea`

- [x] **T2: Fix TypeScript errors in pipeline types and routes**
  - Fix `notFound()` function to accept optional message parameter
  - Fix Convex mutation/query type assertions using `as any`
  - Fix Zod v4 `z.record()` syntax (requires key + value types)
  - Commit: `2cbe4ea`

- [x] **T3: Remove dead code**
  - Remove unused `broadcastAll` function from `pivot/src/server.ts`
  - Move `runDemo.ts` to `pivot/scripts/` directory
  - Commit: `dd9ce65`

- [x] **T4: Clean stale Electron/IPC references**
  - Remove Electron IPC type declarations from `frontend/src/vite-env.d.ts`
  - Add eslint-disable comment for empty Window interface
  - Commit: `dd9ce65`, `8a580c4`

- [x] **T5: Fix misleading comments and debug leftovers**
  - Update "Go API" comments in `useFleetData.ts` to reference Bun server
  - Remove debug `console.log` and no-op `onNodeClick` from `DependencyGraph.tsx`
  - Commit: `dd9ce65`, `8a580c4`

- [x] **T6: Clean up empty directories and organize migration script**
  - Remove empty `pivot/conductor/` directory
  - Move `importSqlite.ts` to `pivot/scripts/migrations/`
  - Commit: `dd9ce65`

## Verification

- `cd pivot && bunx tsc --noEmit` passes with zero errors
- `cd pivot && bun test` — 82 pass, 0 fail
- `cd frontend && npm run test` — 16 files, 29 tests pass
- `cd frontend && npm run build` succeeds
- `cd frontend && npm run lint` passes with zero warnings
