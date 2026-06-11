# Track: Review Remediation — 36h Orchestrator + Notifications + Budgets Audit

## Status

**Retroactive.** The fixes in this track were authored and committed on branch
`fix/review-36h-orchestrator-notifications` during a review of the past 36 hours
of commits, *before* a Measure track existed for them. This track is written
after the fact so the work has a spec, phase breakdown, and commit-linked
evidence trail. No new code is introduced by the track itself — it documents
and verifies what already shipped.

## Problem

A review of the past 36h of commits surfaced three live correctness defects plus
measure-hygiene debt, none of which were covered by an existing track:

1. **Orchestrator — reviewed-task-without-merger stuck in `review`.**
   `handleSuccess`'s post-success write guard skipped the status write for *all*
   reviewer-stage cases, so a task with a reviewer but no merger computed
   `nextStatus='done'` yet never persisted it — it hung in `review` forever.

2. **Orchestrator — git lifecycle a silent no-op in production.** The continuous
   (autonomous) path `server.ts AutoRunner → runAllProjects → runProject →
   handleSuccess` ran with `gitHooks=undefined`, so branch creation, commit-on-
   complete, the onMerger squash-merge, and branch cleanup never ran outside
   tests. The merge feature shipped in the orchestrator hardening track was dead
   in production; the unused `createDefaultGitHooks`/`createAutoPushGitHooks`
   exports had been silenced in `orphans-allowlist.txt` rather than wired.

3. **Budgets — double-counted utilization + duplicate governance events.**
   `costs.recordCost` computed budget utilization off `budget.spent + costUSD`,
   but `reserveBudget` already folds the in-flight reservation into `spent`, so
   the check double-counted and fired `budget_warning`/`budget_breach` events off
   an unpersisted estimate on every cost record, producing duplicates in the
   80–100% band.

4. **Notification mutation hardening.** `updateNotificationPreference` used 5
   `as any` casts, threw plain `Error` (not `ConvexError`) on validation
   rejection, and leaked `_creationTime` past the `preferenceEntry` output
   validator.

5. **Measure hygiene.** `lessons-learned.md`/`tech-debt.md` exceeded the 50-line
   cap; one outstanding review finding (the convex-provider `vi.mock` vitest 4.x
   deprecation) was untracked.

## Goal

Capture the already-shipped remediation as a tracked unit: each defect fixed with
a regression test, governance moved to the single source of truth, the git stage
wired into the production hot path, and measure docs trimmed to cap with the
remaining finding logged as TD-249.

## Acceptance Criteria

1. Reviewer-with-no-merger task transitions to and persists `done`; reviewer-
   with-merger still writes `review` inline. Covered by tests.
2. Production AutoRunner threads configured `gitHooks` through to `runAllProjects`
   on every tick; `GIT_AUTO_PUSH` env (default false) gates remote push. Covered
   by a regression test; the two resolved orphan-allowlist entries removed.
3. Budget governance fires edge-triggered from `reconcileBudgetReservation` only
   (the single source of truth for `spent`), one event per threshold crossing;
   `recordCost` no longer emits governance. Covered by tests.
4. `updateNotificationPreference` is `as any`-free, throws `ConvexError`, and
   strips `_creationTime` to match the output validator.
5. `lessons-learned.md` and `tech-debt.md` are at/under the 50-line cap; TD-249
   logged for the `vi.mock` deprecation.

## Verification

- `pivot test` (handleSuccess + dispatch + AutoRunner wiring) passes.
- `convex` suite (notifications + costs + budgets governance) passes.
- `pivot typecheck` passes.
- `graph.db` synced after the structural changes.

## Related Tech Debt

- TD-249: convex-provider `vi.mock` vitest 4.x deprecation (logged, deferred —
  requires an 8-file consumer refactor).
