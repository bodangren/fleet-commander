# Specification - Fix Git Orchestrator Bugs (TD-013, TD-014)

## Overview

Fix two bugs in the Bun-based git orchestrator hooks that can mislead callers about branch creation success and use fragile positional argument access.

## Bug Descriptions

### TD-013: onTaskStart swallows branch-creation failures

**Location:** `pivot/src/orchestrator/gitOrchestrator.ts:onTaskStart`

**Problem:** When `git checkout -b` throws an error (e.g., branch already exists, invalid base), the catch block still returns `{ branchName }`, misleading callers into thinking the branch was created successfully.

**Impact:** The orchestrator may proceed assuming a branch exists when it doesn't, leading to operations on the wrong branch or silent failures later.

### TD-014: createAutoPushGitHooks uses fragile positional args

**Location:** `pivot/src/orchestrator/gitOrchestrator.ts:createAutoPushGitHooks`

**Problem:** Uses `args[4]` positional index to access the `success` parameter instead of destructuring, which is fragile if the `onTaskComplete` signature changes.

**Impact:** Silent bugs if argument order changes; harder to read and maintain.

## Fix Requirements

### TD-013 Fix

- Return `{ branchName, error: string }` on failure instead of `{ branchName }`
- Add a new `branchCreated: boolean` field to distinguish success/failure
- Update callers to check `branchCreated` before proceeding

### TD-014 Fix

- Destructure `...args` properly using the known signature: `(projectSlug, rootPath, taskId, taskTitle, success)`
- Use named parameters instead of positional index access

## Acceptance Criteria

1. `onTaskStart` returns `{ branchName, branchCreated, error? }` where `branchCreated` is `false` when branch creation fails
2. `createAutoPushGitHooks.onTaskComplete` destructures args by name, not positional index
3. All existing tests pass after refactoring
4. No new TypeScript errors introduced
