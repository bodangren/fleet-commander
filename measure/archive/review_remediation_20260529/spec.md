# Spec: Review Remediation — Four Recent Tracks

## Problem

A cross-track review of Agent A/B Testing, Custom Agent Templates, Multi-Project Portfolio, and Sprint Retrospective Dashboard uncovered **6 P0 bugs** (broken in production), **7 P1 spec violations or data integrity issues**, and **7 P2 technical debt items**. The tracks were marked complete with all plan tasks `[x]`, but multiple spec acceptance criteria are unmet, logic bugs produce wrong results, and test coverage validates code paths that differ from what runs in production.

## Root Causes

1. **Tests validate pure functions, not the Convex query layer.** Retrospective and Portfolio tests mock data that matches the tested function's assumptions but use invalid schema values (e.g., `'completed'`/`'failed'` instead of `'closed'`/`'planned'`/`'active'`).
2. **Schema-implementation drift.** Code checks for status strings that don't exist in validators (dead-code branches).
3. **Duplicate implementations.** Similarity scoring, `formatDuration`, `computeSimilarity`, and `matchTaskToEmployee` exist in multiple places with different semantics.
4. **No frontend tests.** Combined 1200+ lines of UI code across four tracks has zero test coverage.
5. **`as any` type escapes mask missing schema fields.** The `templateId` field doesn't exist in the agents schema, but `(a as any).templateId` hides this.
6. **Single mega-commits.** Each track shipped in 1–2 commits of 670–1272 lines, violating the atomic commit principle.

## Acceptance Criteria

### P0 — Must Fix (Broken in Production)

- [ ] PORT-1: `getProjectHealth` uses `'failed'`/`'completed'` but `sprintStatus` validator defines `'planned'`/`'active'`/`'closed'`. Green and red health rules are dead code. Fix status checks to use `'closed'` (green, within budget) and add a real `'failed'` status or derive failure from task rejection rate.
- [ ] PORT-2: "Start New Sprint" button passes `project._id` (Convex document ID) but `SprintPlanningPage` matches on `p.id` (slug). Fix to pass `project.slug` instead.
- [ ] CAT-1: `deleteTemplateHandler` reads `(a as any).templateId` but the `agents` schema has no `templateId` field. The usage check always passes, allowing deletion of in-use templates. Either add `templateId` to the agents schema with an index, or query task assignments to check usage.
- [ ] CAT-2: `runSchedulerTick` (scheduler.ts:137–147) builds command args without `--system-prompt` or `--temperature` from the matched template, while `executeTaskWithEmployee` (scheduler.ts:89–99) does pass them. Refactor `runSchedulerTick` to call `executeTaskWithEmployee` instead of duplicating execution logic.
- [ ] AB-1: `computeSimilarity` in `convex/lib/similarity.ts` and `pivot/src/routes/abTests.ts` both compute similarity with the denominator using original string length instead of truncated length. Strings > 500 chars produce wrong results (minimum similarity of 0.5 for completely different strings). Fix denominator to use `Math.max(truncatedA.length, truncatedB.length)`, or `Math.max(a.length, b.length, 1)` if truncation is removed.
- [ ] RETRO-1: `getSprintAggregateData` (Convex query) diverges from the tested `aggregateSprintData` (pure function) on 6 computed fields: `planned`, `failed`, `avgDurationMs`, `priorityCorrelation`, `blockerCount`, and `blockedByChains`. Fix the Convex query to match the pure function's logic, or refactor to call the pure function from the query handler.

### P1 — Should Fix (Spec Violations & Data Integrity)

- [ ] RETRO-2: Rejection reasons pull from `dispatchRejections` (agent-not-dispatched reasons like "Agent at max workload") instead of reviewer feedback. Refactor `getSprintRejectionReasons` to use task completion/rejection records, or add a `reviewerFeedback` field to the schema.
- [ ] RETRO-3: `generateInsights` produces only single-dimension insights (velocity, workload, cost). The spec requires cross-dimensional insights like "Agent X had 3x rejection rate on TypeScript tasks." Add agent×rejection and agent×task-type correlation logic.
- [ ] RETRO-4: `BudgetBurndownChart` is a static budget-vs-actual bar chart, not a time-series burndown. Rename the component or add per-checkpoint cost accumulation data and a true burndown line chart.
- [ ] RETRO-5: Errors and execution logs in `getSprintAggregateData` are scoped to the project, not the sprint. Add a sprint filter or a sprint-scoped index to prevent data contamination from other sprints.
- [ ] PORT-3: `rejectionRate` counts all non-completed tasks (including `in_progress` and `blocked`) as rejections. Compute actual rejection rate from tasks with an explicit rejection/failure status.
- [ ] AB-2: Experiment schema lacks `temperature`, `systemPrompt` (for each variant), and `skills` fields. The spec AC requires "two agent configs (model, temperature, system prompt variant, skills)." Add these fields to the `abTests` schema and the create/update handlers.
- [ ] AB-3: The `/run` endpoint generates synthetic random data instead of executing real agents. Replace with actual agent execution or clearly mark as a placeholder with a feature-flag / mock mode toggle.

### P2 — Technical Debt (Quality & Maintenance)

- [ ] ALL-1: Zero frontend test coverage for OptimizePage, AgentTemplatesPage, AgentTemplateEditorPage, PortfolioPage, usePortfolioData, PortfolioRedirect, BudgetBurndownChart, AgentPerformanceBreakdown, RejectionReasonHistogram, SprintRetrospectiveDashboard. Add component tests for each.
- [ ] RETRO-6: Three different `formatDuration` implementations exist in AutoInsights.tsx, AgentPerformanceBreakdown.tsx, and SprintRetrospectiveDashboard.tsx. Extract to `frontend/src/lib/formatDuration.ts`.
- [ ] AB-4: `convex/lib/similarity.ts` `computeSimilarity` has zero callers outside its own test file. The pivot layer has its own `computeSimilarity` with a different algorithm. Remove the Convex dead-code version and consolidate to one implementation.
- [ ] AB-5: `window.location.reload()` is used after creating runs and experiments (OptimizePage.tsx:95, 109, 313). Replace with Convex query invalidation.
- [ ] AB-6: Errors silently caught with `catch { // ignore }` in OptimizePage.tsx (lines 96-97, 314-315). Add error state and user feedback.
- [ ] CAT-3: `AgentTemplate` interface in `scheduler.ts` is manually defined rather than derived from Convex schema. Use the generated API types or a shared type file.
- [ ] CAT-4: Name uniqueness is global, not per-workspace. The spec requires "name unique per workspace." Add `workspaceId` to the `agentTemplates` schema and change `by_name` index to `by_workspaceId_and_name`.
- [ ] RETRO-7: `SprintDetailView.tsx` imports `SprintHistoryItem` from `@/__fixtures__/historyFixtures`. Production code must not import from test fixtures. Create a proper shared type file.
- [ ] RETRO-8: Blob URL revoked too early in Markdown export (`URL.revokeObjectURL` called synchronously after `a.click()`). Use `setTimeout(() => URL.revokeObjectURL(url), 1000)`.
- [ ] PORT-4: Tests in `convex/portfolio.test.ts` use `'completed'` and `'failed'` status strings that don't exist in the schema. Rewrite all test fixtures to use `'planned'`/`'active'`/`'closed'`.
- [ ] PORT-5: `PortfolioRedirect` uses `useConvexProjectsTransformed()` while `PortfolioPage` uses `usePortfolioData()`. Two separate data sources with different shapes for the same projects list. Consolidate to one data source.

## Out of Scope

- Refactoring mega-commits into atomic ones (historical, not practical)
- Adding workspace-scoping to A/B testing experiments (not in original spec)
- Replacing the entire A/B test run endpoint with a real agent executor (requires architecture decisions beyond remediation scope)
- Adding Recharts or D3 chart library (custom HTML/CSS is a valid choice per TD-113)

## Related Tech Debt

- TD-113 (Recharts jsdom issues) — validates the custom HTML/CSS chart approach but doesn't excuse zero test coverage
- TD-141 (Dual project identifier schema) — PORT-2 is a symptom of the same root cause
- TD-145 (Type safety bypass via `as any`) — CAT-1 is a direct instance of this