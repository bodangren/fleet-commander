# Specification: Git Integration v2

## Overview

Address half-implemented git integration identified in the 2026-05-01 architecture review. Current implementation creates branches and commits but lacks: worktree validation, branch cleanup, PR creation, and contextual commit messages. This track completes the git workflow.

## Functional Requirements

### 1. Git Pre-Flight Checks

- Verify clean worktree before `git branch` creation
- Check for uncommitted changes and return meaningful error
- Verify base branch exists before creating feature branch
- Add dry-run option to validate without executing
- Return structured error response with actionable message

### 2. Automatic Branch Cleanup

- Delete local feature branch on task success (configurable)
- Add `git.autoCleanupBranches` config flag (default: true)
- Log cleanup actions to execution logs
- Handle cleanup failure gracefully (don't fail the task)
- Add opt-out per-project via settings

### 3. PR Draft Generation

- Generate PR draft using `gh pr create --draft` after successful commit
- Include task context in PR description (track, spec link, acceptance criteria)
- Auto-link PR to task in execution logs
- Handle missing `gh` CLI gracefully
- Add config flag to enable/disable auto-PR

### 4. Enhanced Commit Messages

- Include task context in commit messages (track ID, task key)
- Add option for LLM-generated commit summaries
- Keep template-based messages as fallback
- Add commit message template configuration
- Validate commit message length and format

## Non-Functional Requirements

- Git operations must not block task execution (< 5s timeout)
- Cleanup failures must not fail the task
- PR creation failures must be logged but not fatal
- All changes must work with existing git workflow

## Acceptance Criteria

- [ ] Git routes verify clean worktree before branch creation
- [ ] Dirty worktree returns meaningful 409 Conflict error
- [ ] Branches auto-deleted on task success (with opt-out)
- [ ] PR drafts auto-created after successful commits
- [ ] Commit messages include task context
- [ ] All git operations have timeout protection
- [ ] Cleanup failures are logged but not fatal
- [ ] Tests cover dirty worktree and cleanup scenarios

## Out of Scope

- Full PR review automation (separate track)
- Git merge strategies (rebase vs merge)
- Multi-remote support
- Git LFS handling
