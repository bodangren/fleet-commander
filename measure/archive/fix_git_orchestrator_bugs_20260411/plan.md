# Implementation Plan - Fix Git Orchestrator Bugs (TD-013, TD-014)

## Phase 1: Fix TD-013 - onTaskStart error handling

- [x] Task: Update `GitHooks` interface in `types.ts` to include `branchCreated` and `error` fields in `onTaskStart` return type
  - Sub-item: Add `branchCreated: boolean` and optional `error?: string` to return type
- [x] Task: Update `createDefaultGitHooks().onTaskStart` to return `{ branchName, branchCreated: true }` on success
  - Sub-item: Return `{ branchName, branchCreated: false, error: string }` on failure
- [x] Task: Update `createAutoPushGitHooks().onTaskStart` wrapper to propagate the new return structure
- [x] Task: Update tests to verify `branchCreated` is `false` when branch creation fails
  - Sub-item: Add test case for duplicate branch name (should return branchCreated: false)
- [x] Task: Run tests — all pass

## Phase 2: Fix TD-014 - destructure args in createAutoPushGitHooks

- [x] Task: Refactor `createAutoPushGitHooks().onTaskComplete` to destructure `...args` using known signature
  - Sub-item: Change from `if (autoPush && args[4])` to `if (autoPush && success)` with proper destructuring
- [x] Task: Update any callers of `onTaskComplete` to use the new return type from TD-013 fix
- [x] Task: Run tests — all pass

## Phase 3: Verification

- [x] Task: Run full test suite — all pass (213 tests)
- [x] Task: Run typecheck — no errors
- [x] Task: Update `measure/tech-debt.md` to mark TD-013 and TD-014 as resolved
- [x] Task: Update plan.md checkboxes, write deviation notes if any
