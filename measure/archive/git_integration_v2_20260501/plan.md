# Implementation Plan: Git Integration v2

## Phase 1: Pre-Flight Checks

- [x] Task: Add worktree validation
    - [x] Created `verifyCleanWorktree()` in GitClient — returns `{ clean, dirtyFiles }`.
    - [x] Checks `git status --porcelain` for uncommitted changes.
    - [x] Returns structured error with dirty files list.

- [x] Task: Integrate into git routes
    - [x] Applied pre-flight check to `/api/git/branch` route.
    - [x] Returns 409 Conflict with `dirtyFiles` list for dirty worktree.
    - [x] Pre-flight also added to orchestrator's `onTaskStart` hook.

## Phase 2: Automatic Branch Cleanup

- [x] Task: Implement cleanup logic
    - [x] `autoCleanupBranches` already in config (default: true).
    - [x] Added branch cleanup in `onTaskComplete` — deletes local branch after successful commit.
    - [x] Cleanup failures are logged but not fatal.
    - [x] Switches to detached HEAD if currently on the branch being deleted.

## Phase 3: PR Draft Generation

- [x] Task: Implement PR creation
    - [x] Added `createPR(title, body, draft)` to GitClient — uses `gh pr create --draft`.
    - [x] Throws on failure with stderr message.

## Phase 4: Enhanced Commit Messages

- [x] Task: Improve commit message generation
    - [x] Updated `generateCommitMessage(taskId, summary, trackId?)` to include track ID.
    - [x] Format: `fc(trackId, task-{taskId}): {summary}` when trackId provided.
    - [x] Truncated to 72 characters max.

## Phase 5: Final Verification

- [x] Task: Run tests and verify
    - [x] All git tests pass (41 tests across 3 files).
    - [x] Pre-flight dirty worktree returns 409.
    - [x] Branch cleanup runs on success, fails gracefully.
