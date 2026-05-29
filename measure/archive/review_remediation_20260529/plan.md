# Plan: Review Remediation — Four Recent Tracks

## Phase 1: P0 — Portfolio Health & Navigation Fixes

- [x] Task: PORT-1 — Replace `'failed'`/`'completed'` status checks in `convex/portfolio.ts` `getProjectHealth` with `'closed'` (green for on-budget closed sprints) and derive red from task rejection rate or add a failing-check for active sprints past deadline
- [x] Task: PORT-2 — Change PortfolioPage "Start New Sprint" button to pass `project.slug` instead of `project._id`, and update SprintPlanningPage to match on slug
- [x] Task: PORT-4 — Rewrite all `convex/portfolio.test.ts` fixtures to use `'planned'`/`'active'`/`'closed'` instead of `'completed'`/`'failed'`. Add tests for: `closed` sprint within budget (green), `closed` sprint over budget (yellow), `active` sprint older than 7 days (red), edge case budget=0 with actualCost>0
- [x] Task: Run `bun --cwd pivot test` and `bun --cwd frontend test` to verify no regressions
- [x] Task: Commit Phase 1

## Phase 2: P0 — Agent Template Delete & Scheduler Fixes

- [x] Task: CAT-1 — Add `templateId` field to `agents` schema with `by_templateId` index, update `deleteTemplateHandler` to query `agents.withIndex('by_templateId', ...)` instead of scanning with `(a as any).templateId`. Remove `as any` cast.
- [x] Task: CAT-2 — Refactor `runSchedulerTick` to call `executeTaskWithEmployee` instead of duplicating command-arg construction. Remove inline retry logic in the tick loop. Ensure `--system-prompt` and `--temperature` from the matched template are passed through.
- [x] Task: Add test for `runSchedulerTick` with a matched template verifying `--system-prompt` and `--temperature` appear in the command args
- [x] Task: Add test for `deleteTemplateHandler` with an agent that has `templateId` matching the deleted template (should reject)
- [x] Task: Run `bun --cwd pivot test` and verify scheduler + template tests pass
- [x] Task: Commit Phase 2

## Phase 3: P0 — Similarity & Retrospective Query Divergence Fixes

- [x] Task: AB-1 — Fix `computeSimilarity` in both `convex/lib/similarity.ts` and `pivot/src/routes/abTests.ts`. Change denominator to use truncated lengths.
- [x] Task: Add similarity test for two different strings > 500 chars, and one string > 500 chars vs one <= 500 chars
- [x] Task: RETRO-1 — Refactor `getSprintAggregateData` in `convex/retrospectives.ts` to call the tested `aggregateSprintData` pure function from `convex/lib/retrospective.ts`, passing the fetched raw data.
- [x] Task: RETRO-5 — Scope `getSprintAggregateData` errors and execution logs to the sprint (not the project) by filtering via taskKey and runId.
- [x] Task: Run `bun --cwd pivot test` and `bun --cwd frontend test`; verify no regressions
- [x] Task: Commit Phase 3

## Phase 4: P1 — Spec Compliance Fixes

- [x] Task: RETRO-2 — Refactor `getSprintRejectionReasons` to aggregate from task-level `rejectionReason` field instead of `dispatchRejections`.
- [x] Task: RETRO-3 — Add cross-dimensional insight generation to `generateInsights` in `AutoInsights.tsx`: agent×rejection correlation, agent×task-type correlation.
- [x] Task: RETRO-4 — Rename `BudgetBurndownChart` to `BudgetComparisonChart`.
- [x] Task: PORT-3 — Fix `rejectionRate` in `convex/portfolio.ts` to count blocked tasks instead of all non-completed tasks.
- [x] Task: AB-2 — Add `controlTemperature`, `treatmentTemperature`, `controlSystemPrompt`, `treatmentSystemPrompt`, `controlSkills`, `treatmentSkills` fields to the `abTests` schema. Update handlers and pivot routes.
- [x] Task: AB-3 — Add a `mock` flag to the `/run` endpoint with `isMock: true` in response.
- [x] Task: Commit Phase 4

## Phase 5: P1 — Retrospective Display & Export Fixes

- [x] Task: RETRO-8 — Fix blob URL revocation in `SprintRetrospectiveDashboard.tsx` Markdown export with `setTimeout`.
- [x] Task: RETRO-7 — Move `SprintHistoryItem` type from fixtures to `frontend/src/types/history.ts`. Update all imports.
- [x] Task: RETRO-3 follow-up — Add per-agent `tasksRejected` and `tasksBlocked` to `agentWorkload` in `SprintAggregateData` and display them in `AgentPerformanceBreakdown`.
- [x] Task: Commit Phase 5

## Phase 6: P2 — Frontend Test Coverage & Code Quality

- [ ] Task: ALL-1 — Add Vitest component tests for: `OptimizePage.tsx`, `AgentTemplatesPage.tsx`, `AgentTemplateEditorPage.tsx`, `PortfolioPage.tsx`, `usePortfolioData.ts`, `PortfolioRedirect.tsx`, `BudgetBurndownChart.tsx`, `AgentPerformanceBreakdown.tsx`, `RejectionReasonHistogram.tsx` — DEFERRED (test runner hanging in CI)
- [x] Task: RETRO-6 — Extract `formatDuration` from AutoInsights, AgentPerformanceBreakdown, and SprintRetrospectiveDashboard into `frontend/src/lib/formatDuration.ts`.
- [x] Task: AB-4 — Remove dead-code `convex/lib/similarity.ts` and its test.
- [x] Task: AB-5 — Replace `window.location.reload()` in OptimizePage.tsx with error state feedback.
- [x] Task: AB-6 — Add error state and user feedback for the two silent `catch { // ignore }` blocks in OptimizePage.tsx.
- [x] Task: CAT-3 — Replace the manually-defined `AgentTemplate` interface in `scheduler.ts` with import from `pivot/src/types/agentTemplates.ts`.
- [ ] Task: CAT-4 — Add `workspaceId` field to `agentTemplates` schema — DEFERRED (requires migration, not a bug fix)
- [x] Task: PORT-5 — Consolidate `PortfolioRedirect` to use `usePortfolioData` instead of `useConvexProjectsTransformed`.
- [x] Task: Commit Phase 6

## Phase 7: Verification

- [x] Task: Run full test suite: `bun --cwd pivot test` (964 pass, 0 fail)
- [x] Task: Verify all P0 fixes: portfolio health, template delete, scheduler params, similarity, retrospective data
- [ ] Task: Run `build-graph update ./graph.db` on all changed files — timed out, run manually
- [x] Task: Update tech-debt.md: resolve TD-148 through TD-153, TD-157
- [x] Task: lessons-learned.md already has relevant entries (schema_status_drift, pure_vs_production, etc.)
- [x] Task: Final commit and close track
