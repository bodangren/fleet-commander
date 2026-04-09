# Implementation Plan - Git Integration (Bun + Convex)

## Phase 1: Git Operations Module

- [ ] Task: Create `pivot/src/git/client.ts` with `GitClient` class using `Bun.spawn`
  - Sub-item: Implement `branch(name, base): Promise<void>` — creates and checks out a new branch
  - Sub-item: Implement `stageAll(): Promise<void>` — runs `git add -A`
  - Sub-item: Implement `commit(message): Promise<void>` — runs `git commit -m`
  - Sub-item: Implement `push(remote, branch): Promise<void>` — runs `git push`
  - Sub-item: Implement `status(): Promise<GitStatus>` — parses `git status --porcelain` and `git rev-list --count`
- [ ] Task: Define `GitStatus` type with: branch, dirty, ahead, behind
- [ ] Task: Implement `slugify(title): string` helper for branch name generation
- [ ] Task: Write tests in `pivot/src/git/client.test.ts` using temp dirs as git repos

## Phase 2: Git Routes and Orchestrator Integration

- [ ] Task: Add `POST /api/git/branch` route for creating task branches
- [ ] Task: Add `POST /api/git/commit` route for auto-committing changes
- [ ] Task: Add `POST /api/git/push` route for pushing to remote
- [ ] Task: Add `GET /api/git/status` route returning current git status
- [ ] Task: Wire git operations into orchestrator task lifecycle

## Phase 3: Dashboard Git Status Component

- [ ] Task: Add `GitStatusBar` React component to frontend
- [ ] Task: Wire git status endpoint to frontend
- [ ] Task: Write component tests for GitStatusBar

## Phase 4: Verification

- [ ] Task: Run pivot tests — all pass
- [ ] Task: Run frontend tests — all pass
- [ ] Task: Verify git status endpoint returns correct data for a real repo
