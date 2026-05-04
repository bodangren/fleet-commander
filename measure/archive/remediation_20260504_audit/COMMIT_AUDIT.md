# Commit-to-Track Audit Report

**Date:** 2026-05-04
**Scope:** All 587 commits compared against track phase claims
**Method:** Map commit message scope → track ID → diff content → plan.md checkbox state

---

## Executive Summary

| Category | Count |
|---|---|
| Tracks with clean commit-to-plan mapping | 14 |
| Tracks with false/ premature completion claims | 3 |
| Tracks implemented but plan never updated | 3 |
| Tracks with scope bundling / creep in commits | 2 |
| Tracks with overstated phase completion | 4 |

---

## Detailed Findings by Track

### CRITICAL: `enforce_contract_reliability_20260504`

| Commit | Message | Code Changes | Plan Claim |
|---|---|---|---|
| `c5e8c13` | "Provision Enforce Contract Reliability Constraints track" | **0 lines of code.** Only creates track metadata, spec, and plan. | ALL 4 phases marked `[x]` |
| *(uncommitted)* | *(working tree only)* | 258 insertions across pivot/src/orchestrator, convex/schema, etc. | N/A |

**Finding:** The track was "provisioned" with a plan showing every task complete, but **not a single line of implementation code was committed**. The entire implementation exists only as uncommitted working tree changes. This is a repeat of the exact failure mode that `review_remediation_20260503` was created to prevent.

**Root cause:** The track's `plan.md` was written with `[x]` checkboxes before any code was written, let alone committed or tested.

---

### CRITICAL: `remediation_20260503_audit`

| Commit | Message | Files Changed | Plan Phase |
|---|---|---|---|
| `f60d316` | "Add new track 'Quality Remediation'" | Creates track files only | Track creation |
| `694358e` | "Phase 1 — Replace fake analytics tests" | 6 files, 904 insertions | Phase 1 `[x]` |
| `03f769b` | "Phase 2 — Restore E2E test integrity" | 3 files, 35 insertions | Phase 2 `[x]` |
| `65ccc14` | "Phase 3+4 — Backfill model; analytics refactored" | 2 files, 13 insertions | Phase 3-4 `[x]` |
| `9289c85` | "Phase 5+6 — Document error suppression; track TD-037" | 2 files, 8 insertions | Phase 5-6 `[x]` |
| `0f83ee5` | **"Mark track 'Quality Remediation' as complete"** | **Only measure files** (11 insertions) | Marked complete |

**Finding:** The completion commit (`0f83ee5`) contains **zero code changes** — it only updates checkboxes in `tracks.md` and `plan.md`. At the time of marking complete, the plan still had 3 unchecked verification subtasks:
- "Verify ≥80% coverage on all Convex analytics query functions" `[ ]`
- "Run full e2e suite: confirm all 23 tests pass" `[ ]`
- "Write test for model parameter behavior" `[ ]`

**Verdict:** Completion was marked prematurely.

---

### HIGH: `symphony_pivot_20260503`

| Commit | Message | Code Changes | Plan Phase |
|---|---|---|---|
| `9be7b12` | "Add Postgres docker-compose" | 4 files, 42 insertions | Phase 1 `[x]` |
| `709c281` | "Add Postgres setup instructions" | README only | Phase 1 `[x]` |
| `79ce586` | "Add lifecycle hooks to Harness Profiles" | 5 files, 247 insertions | Phase 2 `[x]` |
| `8c3d9e0` | "Integrate lifecycle hooks into orchestrator" | 3 files, 76 insertions | Phase 2 `[x]` |
| `0e2b00c` | "Add Symphony exponential backoff formula" | 4 files, 76 insertions | Phase 2 `[x]` |
| `01eca16` | "Opencode session persistence" | 9 files, 94 insertions | Phase 3 `[x]` |
| `d036368` | "Add plan.md task tag parser" | 3 files, 170 insertions | Phase 4 `[x]` |
| `bf1a898` | "Integrate task tags into dispatcher" | 5 files, 110 insertions | Phase 4 `[x]` |
| `eef0160` | **"Mark track 'Symphony Pivot' as complete"** | **Only measure files** (8 insertions) | Marked complete |

**Finding:** The actual code commits are legitimate and map well to plan phases. However, the `review_remediation_20260503` audit found that Phase 2 completion was **overstated**:
- `runProject()` still constructed `RetryManager(DEFAULT_RETRY_CONFIG)` and called legacy `calculateBackoff()` — the Symphony formula existed but was not wired into the actual retry path.
- `afterCreate` hooks were defined in harness profiles but **never invoked** by the orchestration path.

These mismatches were fixed in commit `54dfa1c` (review remediation), meaning the track was marked complete while containing known false claims.

---

### HIGH: `cost_tracking_20260502`

| Commit | Claimed Scope | Actual Files Touched | Issue |
|---|---|---|---|
| `f4220db` | "cost_tracking Phase 1 + **analytics Phase 4 completion**" | `convex/costs.ts`, `convex/analytics.ts`, `convex/lib/cost.ts`, `pivot/src/analytics.test.ts`, `pivot/src/routes/analytics.ts` | **Bundles two tracks' work in one commit.** The cost tracking Phase 1 code is legitimate, but the commit also claims to complete execution analytics Phase 4 (hook metrics, session metrics). |
| `a716e5f` | "Complete cost tracking track — budget management + dashboard" | 41 files, 1814 insertions | **Massive scope creep:** modifies `plan.md` for 17 unrelated future tracks (`adaptive_dispatching`, `agent_marketplace`, `ai_retrospective`, `auth_authorization`, `backlog_grooming`, `continuous_orchestration`, `multi_user`, `notification_system`, `observability_telemetry`, `performance_profiling`, `plugin_system`, `project_templates`, `self_healing`, `workload_balancer`, etc.) |

**Finding:** Commit `a716e5f` is the single worst scope-creep offender in the audit. Its message claims cost tracking completion, but its diff bulk-edits plan files across the entire roadmap. This bundling makes it impossible to bisect or revert cost tracking changes without affecting 17 unrelated tracks.

---

### MEDIUM: Tracks Implemented But Plan Never Updated (Ghost Tracks)

These tracks have **working code committed** but their archived `plan.md` files still show **all tasks as `[ ]` unchecked**:

#### `fix_yaml_safe_schema_20260425`
- **Commit:** `a187e21` — "fix(security): add safe schema to yaml.load() calls (TD-031)"
- **Code:** 6 call sites updated across pivot and frontend
- **Plan:** ALL 8 tasks remain `[ ]`
- **Status in tracks.md:** Listed under "Tech Debt Fixes (2026-04-25)" as complete
- **Verdict:** Code was done and working, but the track's own `plan.md` was never updated.

#### `fix_hardcoded_harness_name_20260423`
- **Commit:** `c533c08` — "fix(td027): derive harness name from run contract instead of hardcoding 'opencode'"
- **Code:** Schema updated, rollup.ts fixed, 54-line test added
- **Plan:** ALL 10 tasks remain `[ ]`
- **Status in tracks.md:** Listed as complete
- **Verdict:** Same pattern — code committed, plan never checked off.

#### `e2e_untested_pages_20260423`
- **Commit:** `346577d` — "chore(e2e): add Playwright tests for untested frontend pages"
- **Code:** 4 new e2e spec files (`simulate.spec.ts`, `reconcile.spec.ts`, `agent-editor.spec.ts`, `harness-editor.spec.ts`), ReconcilePage API wiring
- **Plan:** ALL 10 tasks remain `[ ]`
- **Status in tracks.md:** Listed as complete
- **Verdict:** Same pattern.

---

### MEDIUM: `execution_analytics_20260502`

| Commit | Claimed Scope | Actual Code | Issue |
|---|---|---|---|
| `9f577fd` | "add backend analytics queries (Phase 1)" | `convex/analytics.ts` queries, `pivot/src/routes/analytics.ts` | ✅ Correct |
| `532d035` | "add frontend charts and dashboard (Phase 2)" | Chart components, `AnalyticsDashboard.tsx` | ✅ Correct |
| `f4220db` | "analytics Phase 4 completion" (in cost_tracking commit) | `getHookMetrics`, `getSessionMetrics`, routes, tests | ⚠️ Bundled into unrelated cost_tracking commit |

**Finding:** Phase 4 work was committed under a `cost_tracking` scope prefix. This breaks the audit trail — searching `git log --grep='analytics'` would miss it.

---

### MEDIUM: Policy Tracks with Unfinished Plan Tasks

These archived tracks are marked complete in `tracks.md` but their own `plan.md` files have **unchecked tasks**:

#### `run_contract_protocol_20260415` (A1)
- 2 tasks unchecked: "Replace prose-parsing with contract reads" and "Run full orchestrator end-to-end against fixture project"
- **Verdict:** Acceptable deferrals, but plan should explicitly note them.

#### `harness_capability_schema_20260415` (A2)
- 1 task unchecked: "Wire loader into pivot server startup"
- **Verdict:** Minor deferred task.

#### `reconciliation_event_logging_20260415` (A4)
- 4 tasks unchecked: Route + interval trigger, perf test
- **Verdict:** Deferred to C1, but plan doesn't clearly link the deferral.

---

### LOW: `frontend_e2e_fixes_20260502`

| Commit | Phase | Code | Assessment |
|---|---|---|---|
| `509a99f` | Partial Phase 1 | PipelinesPage fix, OpsPage dedup, ProjectViewPage test fix, track creation | Legitimate — creates track + implements fixes |
| `2d7c4da` | Phase 1 complete | Minor test text fix + plan update | Legitimate |
| `b31b18d` | Phase 2 complete | 5 hook tests + 2 page tests (1522 insertions) | Legitimate |
| `f1db565` | Track complete | PipelinesPage test + plan update | Legitimate |

**Verdict:** Clean mapping. No issues.

---

### LOW: `fix_failing_e2e_20260503`

| Commit | Phase | Code | Assessment |
|---|---|---|---|
| `edab5bd` | Track creation | Creates track files | Legitimate |
| `9dde82c` | Implementation | Fixes 3 failing e2e tests | Legitimate |

**Verdict:** Clean mapping. No issues.

---

## Cross-Cutting Patterns

### Pattern 1: "Mark Complete" Commits with Zero Code

Commits that only update `tracks.md` and `plan.md` checkboxes without changing any source code:
- `0f83ee5` — remediation_20260503_audit
- `eef0160` — symphony_pivot_20260503
- `09da50a` — state_reconciliation_engine C1
- `0b79d17` — state_reconciliation_engine C1
- `51d1a8c` — harness_capability_schema A2
- `54988a2` — dispatch_hard_constraints A3

**Risk:** These commits make it appear that work was done on a specific date, but the actual code may have been committed earlier (or, in the case of `enforce_contract_reliability`, not committed at all).

### Pattern 2: Scope-Bundling Commits

Commits that bundle work from multiple tracks:
- `f4220db` — cost_tracking Phase 1 **+** execution_analytics Phase 4
- `a716e5f` — cost_tracking completion **+** 17 unrelated plan.md edits
- `54dfa1c` — review_remediation (all 5 phases in one commit)

**Risk:** Bisectability is degraded. Reverting one track's work may accidentally revert another's.

### Pattern 3: Ghost Tracks

Tracks where code was implemented but the plan was never updated:
- `fix_yaml_safe_schema_20260425`
- `fix_hardcoded_harness_name_20260423`
- `e2e_untested_pages_20260423`

**Risk:** Future audits cannot trust `plan.md` as a source of truth for what was actually done.

### Pattern 4: Uncommitted Implementation

Tracks with implementation in working tree but not committed:
- `enforce_contract_reliability_20260504` — all 4 phases
- `performance_profiling_20260502` — Phases 1-2 (partial)
- Retrospective feature — fully implemented but untracked

**Risk:** Work can be lost, is invisible to `git log`, and cannot be reviewed or bisected.

---

## Recommendations

1. **Enforce "code before checkbox" policy:** A plan.md task must not be marked `[x]` until the corresponding code is committed and tests pass.
2. **Ban scope-bundling across tracks:** Each commit should affect at most one track's code. plan.md updates for unrelated tracks must be separate commits.
3. **Require diff-size thresholds for completion commits:** A commit that only touches `measure/` files cannot mark a track complete — it must include the actual implementation.
4. **Audit ghost tracks:** Update archived track plans to accurately reflect committed code, or delete plans for tracks that were implemented ad-hoc.
5. **Commit working tree changes immediately:** The uncommitted `enforce_contract_reliability` and `performance_profiling` code must be committed or discarded before further work proceeds.
