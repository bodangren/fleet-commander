# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Notes |
|----|-------------|-------|
| TD-024 | `convex/_generated/api.d.ts` requires manual updates when `npx convex dev` is unavailable offline | Add import + module entry for each new Convex module; `dataModel.d.ts` and `api.js` are schema-driven and auto-update |
| TD-029 | `fleetCatalog.ts:getBootstrapSummary` calls `.collect()` on 9 tables for `.length` — full table scans | Replace with denormalized counters or `query.collect().length` → index-based counting |
| TD-032 | `rollup.ts` stub metrics removed from output but schema still requires them | Spun into focused track `fix_mean_duration_rollup_20260504`; needs real workRuns duration linkage or schema migration |
| TD-034 | Analytics dashboard missing e2e tests for filter interactions (time range, project, agent, priority filters) | Phase 3 pending task from execution_analytics track |
| TD-035 | No performance benchmark for analytics queries — unknown whether 90-day range renders <2s | Deferred from execution_analytics Phase 1; needs synthetic 90-day dataset |
| TD-036 | Hook failure markers not shown on completion trend chart | Deferred from execution_analytics Phase 4; needs hook data flowing through pipeline first |
| TD-037 | `issueState` from `useIssuePreview` fetched but never rendered in ProjectViewPage — blocked-task issue detail is dead code | `issueState` + `clearIssueState` are returned by hook but not destructured in ProjectViewPage.tsx:42; issue detail panel was never wired up |
| TD-038 | `frontend/src/pages/ProjectViewPage.test.tsx` can fail/hang in the full frontend Vitest run | Observed during review_remediation_20260503 verification: test reported `renders project detail, board lanes, and the run action` failed at ~17s, then the suite did not exit until terminated |

## Resolved (pre-2026-04-23)

TD-010–TD-023, TD-025–TD-028, TD-031 resolved 2026-04-15 to 2026-04-25. See git history.

## Resolved (2026-05-05)

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-033 | 15 pivot tests fail in full suite but pass individually — `mock.module()` state leaks across files | Refactored `runAllProjects.test.ts` to dependency injection via optional `deps` param; removed all `mock.module()` calls from pivot tests (2026-05-05) |

## Resolved (2026-05-04)

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-027 | `groupByHarness` hardcodes harness name | `record.harnessName ?? 'opencode'` (2026-04-23) |
| TD-039 | `executor.ts:readStreamWithTokenLimit` enforced `maxTokens` per-stream, not combined | Shared budget object across stdout+stderr readers; combined token limit test added (2026-05-04) |
| TD-040 | `sessionResumeMs = 0` hardcoded | Removed from orchestrator + schema (2026-05-04) |
| TD-041 | PerformanceDashboard only renders SlowAgentLeaderboard | Added PhaseBreakdown + PhaseTrends (2026-05-04) |
| TD-042 | getSprintById uses `v.string()` + `as any` | Changed to `v.id('sprints')` (2026-05-04) |
| TD-043 | `rollup.ts` `medianLatencyMs` and `averageTokens` fabricated from confidence scores | Computation removed; fields set to 0 with TD-043 comment until real data available (2026-05-04) |
| TD-044 | `convex/retrospectives.ts` uses `v.string()` + `as any` for document IDs | Changed to `v.id('retrospectives')` and `v.id('sprints')`; casts removed (2026-05-04) |
| TD-045 | `convex/retrospectives.ts:getSprintAggregateData` does 5 full `.collect()` table scans | Replaced with indexed queries scoped to project (2026-05-04) |
| TD-046 | `convex/lib/retrospective.ts` module-level `TAG_REGEX` with `/g` flag is stateful | Replaced with `matchAll` inside `extractTags` (2026-05-04) |
| TD-047 | `pivot/src/agents/retrospective.md` has 5 sections; `retrospectivePrompt.ts` expects 6 | Added "Priority Accuracy" section to agent prompt; validation sync test added (2026-05-04) |
| TD-048 | `frontend/src/components/MarkdownViewer.tsx` renders unsanitized `javascript:` URLs | Added href sanitization blocking `javascript:` scheme (2026-05-04) |
| TD-049 | `frontend/src/hooks/useRunContract.ts` creates new ConvexClient per taskId without closing old WebSocket | Stored client in ref and call `.close()` in cleanup (2026-05-04) |
| TD-050 | `frontend/src/components/performance/PhaseTrends.tsx` drops hookBeforeAvg/hookAfterAvg | Added `<Line>` components for both hook phases (2026-05-04) |
| TD-051 | `pivot/src/orchestrator/executor.ts` reuses `'timeout'` for token limit exceeded | Added `'tokens_exceeded'` to `failureType` union; executor returns it on token breach (2026-05-04) |
| TD-052 | `convex/lib/retrospective.test.ts` imports from `bun:test` instead of `vitest` | Changed import to `vitest` (2026-05-04) |
