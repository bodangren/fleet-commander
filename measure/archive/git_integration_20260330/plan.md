# Implementation Plan - Git Integration

## Phase 1: Git Operations Wrapper

- [ ] Task: Create `internal/git/git.go` with a `GitClient` struct wrapping `os/exec` calls
  - Sub-item: Implement `Branch(name, base string) error` — creates and checks out a new branch
  - Sub-item: Implement `StageAll() error` — runs `git add -A`
  - Sub-item: Implement `Commit(message string) error` — runs `git commit -m`
  - Sub-item: Implement `Push(remote, branch string) error` — runs `git push`
  - Sub-item: Implement `Status() (GitStatus, error)` — parses `git status --porcelain` and `git rev-list`
- [ ] Task: Define `GitStatus` struct with fields: Branch, Dirty bool, Ahead int, Behind int
- [ ] Task: Write unit tests for each GitClient method using a temp dir initialized as a git repo
  - Sub-item: Test branch creation, staging, commit, and status parsing against real git in test fixtures

## Phase 2: Auto-Branch and Auto-Commit in Orchestrator

- [ ] Task: Hook into orchestrator task-start event to call `GitClient.Branch()` with computed branch name
  - Sub-item: Slugify task title for branch name: lowercase, hyphens, max 40 chars
- [ ] Task: Hook into orchestrator task-completion event to call `StageAll()` then `Commit()`
  - Sub-item: Read `auto_push` config flag; call `Push()` if true
- [ ] Task: Add branch cleanup call after merge confirmation from the dashboard
  - Sub-item: Delete local branch (`git branch -d`) and remote (`git push origin --delete`)
- [ ] Task: Write integration test: start task → branch created → modify file → complete task → commit exists

## Phase 3: Commit Message Generation

- [ ] Task: Implement `internal/git/commit_message.go` with template-based message generation
  - Sub-item: Format: `fc(task-{id}): {one-line summary from agent output}`
- [ ] Task: Add optional LLM-based commit message generation using agent output summary
  - Sub-item: Fall back to template if LLM call fails or is disabled
- [ ] Task: Write tests for template generation and LLM fallback with mock responses

## Phase 4: Dashboard Git Status Display

- [ ] Task: Add `GET /api/git/status` endpoint returning `GitStatus` JSON
- [ ] Task: Create `GitStatusBar` React component showing branch name, dirty indicator, ahead/behind badges
  - Sub-item: Poll every 5s or subscribe via WebSocket if available
- [ ] Task: Integrate `GitStatusBar` into the main layout header
- [ ] Task: Write component tests for `GitStatusBar` rendering with mock status data

## Phase 5: Verification

- [ ] Task: End-to-end test: create task → auto-branch → agent modifies file → auto-commit → verify commit log
- [ ] Task: Verify dashboard git status reflects real repo state after operations
- [ ] Task: Verify push to remote succeeds with auto-push enabled on a test remote
