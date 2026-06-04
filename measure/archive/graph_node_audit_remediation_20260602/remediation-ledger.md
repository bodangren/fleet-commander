# Graph Node Audit Remediation Ledger

Source: `measure/reviews/graph-node-audit/MASTER-REPORT.md` §6 Top-25 Master Improvement Queue.

## Top-25 Checklist

| Rank | Severity | Owner area | Finding | Phase | Status | Evidence path | Validation command |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Critical | Convex | `scoreAudit.createScoreAudit` does not insert | Phase 1 | fixed | `convex/scoreAudit.ts`, `convex/scoreAudit.test.ts`, `convex/schema/analytics.ts` | `bun test ./convex/scoreAudit.test.ts ./convex/lib/auth.test.ts ./convex/schema.test.ts`; `bun test ./convex` |
| 2 | Critical | Convex auth | Missing `auth.config.ts`; anonymous bootstrap ungated | Phase 1 | fixed | `convex/lib/auth.ts`, `convex/auth.config.ts`, `convex/lib/auth.test.ts` | `bun test ./convex/lib/auth.test.ts`; `bun test ./convex` |
| 3 | Critical | Pivot reconciliation | `loadCanonicalState` / `saveCanonicalState` no-op | Phase 1 | fixed | `pivot/src/reconciliation/sweep.ts`, `pivot/src/reconciliation/sweep.test.ts` | `bun --cwd pivot test src/reconciliation/sweep.test.ts` |
| 4 | Critical | Pivot reconciliation | `computeMarkdownHash` uses 32-bit djb2 | Phase 1 | fixed | `pivot/src/reconciliation/hash.ts`, `pivot/src/reconciliation/sweep.test.ts` | `bun --cwd pivot test src/reconciliation/sweep.test.ts` |
| 5 | Critical | Pivot client | `convexClient.ts` and `typedConvexClient.ts` parallel implementations | Phase 3 | pending | `pivot/src/convexClient.ts`, `pivot/src/typedConvexClient.ts` | `bun --cwd pivot typecheck` |
| 6 | Critical | Pivot planning | `recommender.ts` imports across slice boundary | Phase 4 | pending | `pivot/src/planning/recommender.ts` | `npm run lint` |
| 7 | Critical | Pivot orchestrator | `runProject` god-function | Phase 5 | pending | `pivot/src/orchestrator/orchestrator.ts` | `bun --cwd pivot test src/orchestrator` |
| 8 | Critical | Pivot orchestrator | `runAutoRunner` racy interval closure | Phase 2 | pending | `pivot/src/orchestrator/autoRunner.ts` | `bun --cwd pivot test src/orchestrator/autoRunner.test.ts` |
| 9 | Critical | Pivot orchestrator | `sendPromptToSession` flag-based timeout race | Phase 2 | pending | `pivot/src/orchestrator/sdkClient.ts` | `bun --cwd pivot test src/orchestrator/sdkClient.test.ts` |
| 10 | Critical | Pivot orchestrator | Dead recovery/continuous-mode exports | Phase 2 | deleted | `pivot/src/orchestrator/recoveryDispatcher.ts`, `continuousMode.ts`, `taskQueue.ts`, `concurrencyLimiter.ts`, `autoPauseHandler.ts`, `circuitBreaker.ts` | `bun --cwd pivot typecheck`; `bun --cwd pivot test src/orchestrator` — all 6 modules had zero production callers; orchestrator uses Convex-backed circuit breaker via API |
| 11 | Critical | Pivot orchestrator | Parallel `scheduler.ts` execution path | Phase 2 | pending | `pivot/src/orchestrator/scheduler.ts` | `bun --cwd pivot test src/orchestrator` |
| 12 | Critical | Pivot policy | `p50Cost` computed from confidence | Phase 1 | fixed | `pivot/src/policy/rollup.ts`, `pivot/src/policy/rollup.test.ts` | `bun --cwd pivot test src/policy/rollup.test.ts`; `bun --cwd pivot test` |
| 13 | Critical | Pivot policy | `weeklyReport.ts` top-level execution | Phase 1 | fixed | `pivot/src/policy/weeklyReport.ts` | `bun --cwd pivot test src/policy/weeklyReport.test.ts`; `bun --cwd pivot test` |
| 14 | Critical | Pivot policy | `WorktreeManager` / `DispatchPacer` orphan exports | Phase 2 | deleted | `pivot/src/policy/allocator.ts` | `bun --cwd pivot typecheck`; `bun --cwd pivot test src/policy` — classes removed; `canAdmit`, `AllocationPolicy`, `TaskDescriptor` retained for production `constraints.ts` |
| 15 | Critical | Pivot policy | `applyBudgetPenalty` dead in production | Phase 2 | deleted | `pivot/src/policy/economic.ts` | `bun --cwd pivot typecheck`; `bun --cwd pivot test src/policy` — entire file deleted, zero production callers |
| 16 | Critical | Frontend markdown | Duplicate editor/viewer parser | Phase 3 | pending | `frontend/src/components/MarkdownEditor.tsx`, `frontend/src/components/MarkdownViewer.tsx` | `bun --cwd frontend test Markdown` |
| 17 | Critical | Frontend settings | `SettingsPage` god-file and preferences race | Phase 5 | pending | `frontend/src/pages/SettingsPage.tsx` | `bun --cwd frontend test SettingsPage` |
| 18 | Critical | Frontend hooks | `useConvexData.ts` god-file | Phase 5 | pending | `frontend/src/lib/useConvexData.ts` | `bun --cwd frontend test useConvexData` |
| 19 | Critical | Frontend realtime | `useConvexRealtime.ts` god-file | Phase 5 | pending | `frontend/src/lib/useConvexRealtime.ts` | `bun --cwd frontend test useConvexRealtime` |
| 20 | High | Pivot routes | `git.ts` project lookup route landmine | Phase 1 | reclassified-with-evidence | `pivot/src/routes/git.ts`, `convex/projects.ts`, `convex/_generated/api.d.ts` | `bun --cwd pivot typecheck`; `api.projects.getProjectByNameHandler` exists in source and typecheck passes |
| 21 | High | Pivot routes | Route test gaps | Phase 6 | pending | `pivot/src/routes/*.ts` | `bun --cwd pivot test src/routes` |
| 22 | High | Frontend kanban | Legacy kanban single production caller | Phase 3 | pending | `frontend/src/components/legacy/KanbanBoard.tsx` | `bun --cwd frontend test ProjectViewPage` |
| 23 | High | Frontend hooks | `useSprintHistoryQuery` start and end dates aliased | Phase 4 | pending | `frontend/src/lib/useConvexData.ts` | `bun --cwd frontend test useConvexData` |
| 24 | High | Convex analytics | `.collect()` then in-memory task filtering | Phase 6 | pending | `convex/analytics.ts` | `bun test convex/analytics.test.ts` |
| 25 | High | Convex employees | ID validators and `_id` filters bypass `v.id` | Phase 4 | pending | `convex/employees.ts` | `bun test convex/employees.test.ts` |

## Baseline Validation

- `build-graph audit ./graph.db --json`: completed 2026-06-02; saved raw output to `/tmp/opencode/graph-audit-baseline.json`. Existing graph issues include missing archived `custom_agent_templates_20260527` track files and stale performance symbols.
- `npm run lint`: no root script exists; use package checks instead.
- `bun --cwd pivot typecheck`: pass after repairing pre-existing performance type exports and sync-script syntax.
- `bun --cwd frontend check`: pass after repairing pre-existing retrospective/history type and lint issues.
- `bun --cwd pivot test`: pass (791 tests after Phase 2 deletions).
- `bun test ./convex`: pass (488 tests).
- `bun --cwd frontend test`: timed out after 300s with tests still passing up to termination; no Phase 1 frontend behavior changes, but rerun remains needed before full track closeout.
- Existing baseline failures: root `npm run lint` script missing; frontend full test command exceeds current shell timeout.
- Orphan-export guard (`measure/orphan-export-guard.sh`): 15 pivot source files flagged with no non-test importers (see guard output for full list).

## Canonical Duplicate Decisions

- TD-200 is the canonical score-audit persistence debt. TD-245 is a duplicate proposal and is not copied into `measure/tech-debt.md`.

## Proposed-list Traceability

- Durable lessons from `PROPOSED-lessons-learned-additions.md` are merged into `measure/lessons-learned.md` where not already covered by existing track-closeout, dead-code, duplication, and test-coverage entries.
- Unresolved Top-25 debt from `PROPOSED-tech-debt-additions.md` is merged into `measure/tech-debt.md` as TD-200 through TD-224, excluding duplicate TD-245.
