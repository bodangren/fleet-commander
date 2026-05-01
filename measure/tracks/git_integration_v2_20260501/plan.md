# Implementation Plan: Git Integration v2

## Phase 1: Pre-Flight Checks

- [ ] Task: Add worktree validation
    - [ ] Create `verifyCleanWorktree()` helper in GitClient
    - [ ] Check for uncommitted changes before branch creation
    - [ ] Return structured error with details
    - [ ] Add dry-run option to validation

- [ ] Task: Integrate into git routes
    - [ ] Apply pre-flight check to `/api/git/branch`
    - [ ] Return 409 Conflict for dirty worktree
    - [ ] Include dirty files list in error response
    - [ ] Write tests for dirty worktree scenarios

## Phase 2: Automatic Branch Cleanup

- [ ] Task: Implement cleanup logic
    - [ ] Add `autoCleanupBranches` to config (default: true)
    - [ ] Delete local branch on task success in orchestrator
    - [ ] Log cleanup actions to execution logs
    - [ ] Handle cleanup failure gracefully

- [ ] Task: Add per-project opt-out
    - [ ] Add `git.autoCleanupBranches` setting to Convex
    - [ ] Check setting before cleanup
    - [ ] Write tests for cleanup behavior
    - [ ] Write tests for opt-out

## Phase 3: PR Draft Generation

- [ ] Task: Implement PR creation
    - [ ] Add `createPR()` method to GitClient
    - [ ] Generate PR description from task context
    - [ ] Use `gh pr create --draft` command
    - [ ] Handle missing `gh` CLI gracefully

- [ ] Task: Integrate into orchestrator
    - [ ] Call PR creation after successful commit
    - [ ] Add `git.autoCreatePR` config flag
    - [ ] Link PR to task in execution logs
    - [ ] Write tests for PR creation flow

## Phase 4: Enhanced Commit Messages

- [ ] Task: Improve commit message generation
    - [ ] Update `generateCommitMessage()` with task context
    - [ ] Add track ID and task key to message
    - [ ] Add config for message template
    - [ ] Validate message length

- [ ] Task: Add LLM-generated summaries (optional)
    - [ ] Add hook for LLM commit message generation
    - [ ] Fall back to template if LLM unavailable
    - [ ] Write tests for message generation

## Phase 5: Final Verification

- [ ] Task: Run tests and verify
    - [ ] Run all pivot tests
    - [ ] Verify git routes work correctly
    - [ ] Test cleanup and PR creation
    - [ ] Verify no regressions
