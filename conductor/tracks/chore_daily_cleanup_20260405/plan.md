# Track: Daily Cleanup 2026-04-05

**Type:** chore  
**Status:** [~] In Progress  
**Created:** 2026-04-05  
**Priority:** High  

## Summary

Daily refactor/cleanup of previous day's work. Fixes TypeScript errors in pivot codebase, removes dead code, cleans stale Electron references, and removes debug leftovers.

## Tasks

- [ ] **T1: Fix TypeScript errors in pivot test files**
  - Fix mock signature mismatches in `orchestrator.test.ts` (16 errors)
  - Add missing `parallel` property in `pipeline/runner.test.ts` step objects (10 errors)
  - Commit: `fix(pivot): Fix TypeScript errors in orchestrator and pipeline tests`

- [ ] **T2: Fix TypeScript errors in pipeline types and routes**
  - Fix `notFound()` calls with arguments in `routes/pipelines.ts` (4 calls)
  - Fix Convex function reference type assertions in route handlers
  - Commit: `fix(pivot): Fix TypeScript errors in pipeline types and routes`

- [ ] **T3: Remove dead code**
  - Remove unused `broadcastAll` function from `pivot/src/server.ts`
  - Move `runDemo.ts` to `pivot/scripts/` directory (or document as standalone)
  - Commit: `chore(pivot): Remove dead code and organize demo script`

- [ ] **T4: Clean stale Electron/IPC references**
  - Remove Electron IPC type declarations from `frontend/src/vite-env.d.ts`
  - Remove references to non-existent `../shared/ipc` module
  - Commit: `chore(frontend): Remove stale Electron IPC type declarations`

- [ ] **T5: Fix misleading comments and debug leftovers**
  - Update "Go API" comments in `useFleetData.ts` to reference Bun server
  - Remove debug `console.log` from `DependencyGraph.tsx`
  - Commit: `chore: Fix misleading comments and remove debug leftovers`

- [ ] **T6: Clean up empty directories and organize migration script**
  - Remove empty `pivot/conductor/` directory
  - Move `importSqlite.ts` to `pivot/scripts/` with documentation
  - Commit: `chore(pivot): Clean empty directories and archive migration script`

## Verification

- `cd pivot && npx tsc --noEmit` passes with zero errors
- `cd pivot && bun test` passes all suites
- `cd frontend && npm run test` passes all suites
- `cd frontend && npm run build` succeeds
- `cd frontend && npm run lint` passes with zero warnings
