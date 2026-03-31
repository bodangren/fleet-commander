# Implementation Plan - Pull Request Automation

## Phase 1: PR Creation via CLI Wrapper

- [ ] Task: Create `internal/pr/client.go` defining a `PRClient` interface with `Create`, `GetStatus`, `Merge` methods
- [ ] Task: Implement `internal/pr/github.go` — `GitHubClient` using `gh pr create`, `gh pr view`, `gh pr merge`
  - Sub-item: Parse JSON output from `gh` for PR URL, number, and status
  - Sub-item: Handle auth errors gracefully; surface actionable message to user
- [ ] Task: Implement `internal/pr/gitlab.go` — `GitLabClient` using `glab mr create`, `glab mr view`, `glab mr merge`
  - Sub-item: Mirror GitHubClient interface so they are swappable
- [ ] Task: Factory function selecting client based on `provider` field in project config
- [ ] Task: Write unit tests for both clients with mocked exec.Command outputs

## Phase 2: PR Description Generation

- [ ] Task: Implement `internal/pr/description.go` that builds PR body from task spec + agent summary
  - Sub-item: Template: title, summary, acceptance criteria checklist, task link, agent notes
- [ ] Task: Add optional LLM call to polish the description (controlled by config flag)
  - Sub-item: Fall back to template-only if LLM is unavailable
- [ ] Task: Write tests for template rendering and LLM-enhanced output with fixtures

## Phase 3: PR Status Tracking and Dashboard Display

- [ ] Task: Implement background poller that checks PR status every 30s for open PRs
  - Sub-item: Store status in memory keyed by PR URL; emit event on transition
- [ ] Task: Add `GET /api/prs` endpoint listing tracked PRs with status and linked task IDs
- [ ] Task: Create `PRStatusBadge` React component (open = green, merged = purple, closed = red)
- [ ] Task: Integrate badge into task detail view with link to PR on provider
- [ ] Task: Write component tests rendering each status variant

## Phase 4: Auto-Merge Logic

- [ ] Task: Implement merge precondition checker — query CI check status via `gh pr checks` or `glab mr pipeline`
  - Sub-item: Only proceed when all required checks report `success`
- [ ] Task: Add `auto_merge` boolean to pipeline/project config; default to `false`
- [ ] Task: Trigger merge call when checks pass and auto-merge is enabled
  - Sub-item: Log merge result; update tracked status to `merged`
- [ ] Task: Write tests for merge precondition logic with mock check results (all-pass, pending, failed)

## Phase 5: Verification

- [ ] Task: Integration test on a temp git repo: complete task → PR created with correct body → status tracked
- [ ] Task: Verify dashboard shows PR badge and links to the correct provider URL
- [ ] Task: Verify auto-merge fires only after all checks pass on a stubbed provider
