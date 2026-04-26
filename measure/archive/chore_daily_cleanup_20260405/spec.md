# Spec: Daily Cleanup 2026-04-05

## Problem

After previous day's tech debt fixes and platform pivot work, the codebase accumulated:

1. **TypeScript errors in pivot/src/**: 30 TS errors across test files, pipeline types, and route handlers (mock signature mismatches, missing `parallel` properties, `notFound()` argument issues)
2. **Dead code**: `broadcastAll` function in `server.ts` never called; `runDemo.ts` orphaned demo script
3. **Stale Electron/IPC references**: `frontend/src/vite-env.d.ts` still declares Electron IPC APIs that no longer exist
4. **Misleading comments**: `useFleetData.ts` references "Go API" when Bun server replaced it
5. **Debug leftovers**: `console.log` in `DependencyGraph.tsx` (line 189)
6. **Empty directories**: `pivot/measure/` (0 files), `frontend/node_modules/.vite-temp/`
7. **One-time migration script**: `pivot/src/migration/importSqlite.ts` should be archived or documented

## Solution

Systematically fix TS errors, remove dead code, clean stale references, and organize orphaned files.

## Acceptance Criteria

- [ ] `cd pivot && npx tsc --noEmit` exits with zero errors
- [ ] `cd frontend && npm run test` passes all suites
- [ ] `cd pivot && bun test` passes all suites
- [ ] `cd frontend && npm run build` succeeds
- [ ] No dead/unused functions remain in production code
- [ ] No stale Electron/IPC type declarations
- [ ] No misleading technology references in comments
- [ ] Empty directories removed
- [ ] Debug console.log statements removed from production components

## Technical Notes

- Do not change any runtime behavior — this is purely cleanup
- Keep changes minimal and focused per task
- Each task should have its own commit
- Migration script (`importSqlite.ts`) should be moved to `scripts/` or archived, not deleted (may be needed for future migrations)
