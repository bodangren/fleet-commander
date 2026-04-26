# Spec: Daily Cleanup 2026-04-04

## Problem

After recent platform pivot work, the codebase accumulated:
1. Duplicate imports and function calls in `pivot/src/server.ts`
2. Duplicate test cases in pipeline tests
3. 23 ESLint errors across 13 frontend files (unused imports/variables)
4. Duplicated status icon/color/format utilities in two pipeline components
5. Stale Go server artifacts (`cmd/server/` empty dir, `'go'` data source references)

## Solution

Systematically remove all identified dead code, fix lint errors, extract shared utilities, and clean up stale references.

## Acceptance Criteria

- [ ] `npm run lint` exits with zero errors
- [ ] `npm run test` passes all suites
- [ ] `npm run build` succeeds
- [ ] No duplicate imports or function calls remain
- [ ] No unused imports in frontend components
- [ ] Shared utilities extracted to single source of truth
- [ ] Stale Go references removed

## Technical Notes

- Do not change any runtime behavior — this is purely cleanup
- Keep changes minimal and focused
- Each task should have its own commit
