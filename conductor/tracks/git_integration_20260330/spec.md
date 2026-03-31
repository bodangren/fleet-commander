# Specification - Git Integration

## Overview
Add Git operations to Fleet Commander so that each task runs on its own branch, changes are auto-committed on completion, and git status is visible in the dashboard. All Git operations shell out to the `git` binary via `os/exec`, reusing the existing command runner infrastructure.

## Functional Requirements

- **FR1**: Auto-branch per task with naming convention `fc/task-{id}-{slug}`.
- **FR2**: Stage and commit all changes automatically after task completion (`git add -A` + `git commit`).
- **FR3**: Generate meaningful commit messages from the task specification and agent output summary.
- **FR4**: Push to remote on approval with configurable auto-push vs. manual push.
- **FR5**: Branch cleanup after successful merge back to the base branch.
- **FR6**: Git status visible in the dashboard (current branch, uncommitted changes, ahead/behind remote).

## Acceptance Criteria

1. When a task starts, a branch `fc/task-{id}-{slug}` is created from the configured base branch.
2. On task completion, all modified files are staged and committed with a generated message.
3. Commit messages reference the task ID and include a one-line summary of agent output.
4. Pushing to remote succeeds when auto-push is enabled and prompts when set to manual.
5. After merge, the task branch is deleted locally and remotely.
6. Dashboard shows current branch name, dirty/clean state, and ahead/behind counts updated within 5 seconds.

## Out of Scope

- Merge conflict resolution automation.
- Interactive rebase or history rewriting.
- Git LFS support.
- SSH key management.
