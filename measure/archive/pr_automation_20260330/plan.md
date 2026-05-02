# Implementation Plan - Pull Request Automation

## Phase 1: PR Creation via CLI Wrapper

- [x] Task: Create PRClient interface with Create, GetStatus, Merge methods (`pivot/src/pr/types.ts`)
- [x] Task: Implement GitHubClient using `gh pr create`, `gh pr view`, `gh pr merge` (`pivot/src/pr/github.ts`)
- [x] Task: Implement GitLabClient using `glab mr create`, `glab mr view`, `glab mr merge` (`pivot/src/pr/gitlab.ts`)
- [x] Task: Factory function selecting client based on `provider` field (`pivot/src/pr/factory.ts`)
- [x] Task: Write unit tests for description generation (3 tests)

## Phase 2: PR Description Generation

- [x] Task: Implement `generatePRDescription()` building PR body from task spec + agent summary
- [x] Task: Template includes title, summary, acceptance criteria checklist, task link, agent notes

## Phase 3: PR Status Tracking and Dashboard Display

- [x] Task: In-memory PR tracking map with status updates
- [x] Task: `GET /api/prs` endpoint listing tracked PRs
- [x] Task: `GET /api/pr/:number/status` endpoint
- [x] Task: `POST /api/pr/create` endpoint with full description generation

## Phase 4: Auto-Merge Logic

Deferred — requires CI check integration (`gh pr checks`).

## Phase 5: Verification

- [x] Task: PR description generation tests pass (3 tests)
- [x] Task: Routes registered in server.ts
