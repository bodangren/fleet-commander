# Review Remediation — Implementation Plan

## Phase 1: Correct Track State And Baseline Evidence

- [x] Task: Reconcile completion claims with review findings
  - [x] Update `measure/tracks.md` to show this remediation track as active
  - [x] Add review notes to affected track plans where phase completion was overstated
  - [x] Preserve existing dirty user changes in track metadata
- [x] Task: Capture current verification baseline
  - [x] Run targeted Convex library tests — 98 pass, 0 fail after remediation helpers were added
  - [x] Run frontend unit tests — `ProjectViewPage.test.tsx` failed/hung after reporting one failing test; frontend check passed
  - [x] Run pivot tests and record remaining baseline failures by exact test name — 753 pass, 15 fail; failures listed in Phase 5

## Phase 2: Fix Symphony Runtime Mismatches

- [x] Task: Write failing tests for actual Symphony retry use in `runProject`
  - [x] Assert retry delay uses deterministic Symphony calculation through focused retry/orchestrator tests
  - [x] Assert retry delay path is deterministic and jitter-free when Symphony mode is active
- [x] Task: Implement Symphony retry wiring
  - [x] Replace legacy retry path where the Symphony plan claims deterministic backoff
  - [x] Keep existing legacy behavior only inside `RetryManager.calculateBackoff()` for callers that explicitly use it
- [x] Task: Resolve `after_create` hook behavior
  - [x] Define the runtime event that triggers `afterCreate`: successful git branch/worktree creation via `gitHooks.onTaskStart`
  - [x] Add/verify hook tests proving `afterCreate` is selected and executed in the supplied working directory
  - [x] Keep Symphony task complete because runtime now invokes `afterCreate` when branch creation succeeds

## Phase 3: Make Analytics Filters Honest

- [x] Task: Add tests for analytics filter behavior
  - [x] Verify agent filter changes agent-utilization results
  - [x] Verify priority filter changes applicable analytics results
  - [x] Verify unsupported filters are not shown on charts/routes where they cannot apply — priority is only sent to task-backed chart routes; hook metrics remain project/time scoped
- [x] Task: Implement route/query support for real filters
  - [x] Forward agent and priority filter params through pivot routes
  - [x] Apply filters in Convex analytics query logic and pure computation helpers
  - [x] Update chart components to send backend filters instead of relying on client-only partial filtering

## Phase 4: Fix Cost-Per-Task Metric

- [x] Task: Write tests for cost-per-task denominator logic
  - [x] Include a completed task with no cost record
  - [x] Include a cost record for a non-completed task
  - [x] Include project-filtered and unfiltered cases through the shared helper used by both query branches
- [x] Task: Correct `getCostPerTask`
  - [x] Use cost-record task IDs intentionally
  - [x] Ensure denominator matches the product definition for cost-per-task
  - [x] Keep query paths index-based where possible

## Phase 5: Verification And Documentation Closure

- [x] Task: Run focused and broad validation
  - [x] `bun test ./convex/lib/analytics.test.ts ./convex/lib/cost.test.ts ./convex/lib/costMetrics.test.ts ./convex/lib/budget.test.ts` — 98 pass, 0 fail
  - [x] `bun --cwd frontend check` — passed
  - [x] `bun --cwd frontend test` — failed/hung after `ProjectViewPage.test.tsx > ProjectViewPage > renders project detail, board lanes, and the run action`
  - [x] `bun --cwd pivot typecheck` — passed
  - [x] `bun --cwd pivot test` — 753 pass, 15 fail: `executeTask > returns failure when agent cannot be resolved`; `enforceCoverageThreshold > returns violated=true and creates blocker when below threshold`; `enforceCoverageThreshold > calls onViolation hook instead of creating blocker directly`; `enforceCoverageThreshold > uses custom trackType from getTrackType hook`; `runProject with coverage enforcement > blocks task and returns failed when coverage drops below threshold`; `runProject with coverage enforcement > succeeds normally when coverage is above threshold`; `runProject with coverage enforcement > succeeds normally when no coverage data is present`; `selectBestCandidate > selects highest-scoring candidate`; `selectBestCandidate > flags llmTieBreak when top scores are close`; `selectBestCandidate > does not flag tie break when scores differ significantly`; `simulateDispatches > matches historical choice with default weights and no extra rules`; `simulateDispatches > computes delta impact based on score difference`; `scoreAudit client > creates a score audit row`; `dispatchPolicyStats client > lists dispatch policy stats`; `harnessReliabilityStats client > lists harness reliability stats`
- [x] Task: Update Measure documents after implementation
  - [x] Mark this plan accurately based on actual completed work
  - [x] Update `measure/tracks.md` status and summary
  - [x] Update `measure/tech-debt.md` only for true deferred work that remains
