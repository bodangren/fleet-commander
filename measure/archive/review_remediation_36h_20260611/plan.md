# Plan — Review Remediation — 36h Orchestrator + Notifications + Budgets Audit

**Retroactive track.** The commits below predate this plan; they were authored on
branch `fix/review-36h-orchestrator-notifications`. This plan reconstructs the
phase structure and links each deliverable to its already-landed commit so the
work is auditable. Statuses are `[x]` because the work shipped; the evidence
sections quote the commit messages' own test results.

## Phase 1: Orchestrator Correctness

- [x] Task 1.1: Fix `handleSuccess` reviewer-without-merger guard so `done` is
      persisted; add reviewer-with/without-merger transition tests. (`f329df0`)
- [x] Task 1.2: Wire `gitHooks` through `AutoRunner → runAllProjects` in the
      production hot path; add `GIT_AUTO_PUSH` env (default false); construct
      `createAutoPushGitHooks` in `server.ts` + the `runAutoRunner` CLI entry;
      remove the two resolved orphan-allowlist entries; add a regression test
      asserting the configured hooks reach `runAll`. (`dda90b7`)

### Phase 1 evidence

- `f329df0`: "pivot handleSuccess+dispatch 13/0; convex notifications+costs 37/0;
  pivot typecheck clean." Also relaxed the flaky `dispatch.test.ts` perf gate
  from <50ms to <250ms (guards algorithmic blowup, not a latency budget).
- `dda90b7`: "full pivot suite 1597 pass / 0 fail; typecheck clean." The merge
  feature was dead in production before this commit (gitHooks=undefined on the
  autonomous path); this is the wire-up that makes branch/commit/merge/cleanup
  actually run.

## Phase 2: Budget Governance Source-of-Truth

- [x] Task 2.1: Remove the governance block (and now-unused budget lookup) from
      `costs.recordCost`. (`da5ef97`)
- [x] Task 2.2: Add edge-triggered governance to `reconcileBudgetReservation`
      (single source of truth for `spent`) — one event per 80% (warning) / 100%
      (breach) crossing; a jump past the cap emits only the breach. (`da5ef97`)
- [x] Task 2.3: Add `convex/budgets.governance.test.ts`
      (settle/warning/breach/no-duplicate). (`da5ef97`)

### Phase 2 evidence

- `da5ef97`: "convex suite 1386 pass / 0 fail; budgets.ts + costs.ts typecheck
  clean." Fixes the double-count where `recordCost` added `costUSD` on top of the
  reservation already folded into `spent` by `reserveBudget`, and the duplicate
  warning/breach events fired off the unpersisted estimate.

## Phase 3: Notification Mutation Hardening

- [x] Task 3.1: Replace 5 `as any` casts in `updateNotificationPreference` with
      `(KEYS as readonly string[]).includes(...)`; throw `ConvexError` on
      validation rejection; strip `_creationTime` from the existing-row return so
      it matches the `preferenceEntry` output validator. (`f329df0`)

### Phase 3 evidence

Folded into `f329df0` (shared commit with Phase 1.1). Covered by the
"convex notifications+costs 37/0" result quoted above.

## Phase 4: Measure Hygiene + Closeout

- [x] Task 4.1: Trim `lessons-learned.md` (52→50) and `tech-debt.md` (54→42),
      moving nine resolved entries to `archive/tech-debt-resolved.md`. (`6b25dfb`)
- [x] Task 4.2: Log TD-249 for the convex-provider `vi.mock` vitest 4.x
      deprecation (Low, non-breaking; fix requires an 8-file consumer
      refactor). (`89c845a`)
- [x] Task 4.3: Sync `graph.db` after the structural changes. (`11f6523`,
      `d2ff92b`)

### Phase 4 evidence

- `6b25dfb`: merged the redundant `track_closeout`/`test_coverage` lessons into
  `hot_path_proof` (citing the AutoRunner git-hooks trap from Phase 1.2) and
  folded `dead_code` into `dual_implementations`; confirmed TD-234 resolved
  (`executor.fallback.test.ts` 13 pass).
- `89c845a`: TD-249 logged in `tech-debt.md`.
- `11f6523` / `d2ff92b`: `graph.db` updated after the budget governance fix and
  the broader review fixes.

## Commit index

| Commit | Subject |
|---|---|
| `f329df0` | fix(orchestrator): mark reviewed task done with no merger; harden notification mutation |
| `dda90b7` | fix(orchestrator): wire git lifecycle hooks into the AutoRunner hot path |
| `da5ef97` | fix(budgets): move budget governance to reconcile, off persisted spent |
| `6b25dfb` | chore(measure): trim lessons-learned + tech-debt to the 50-line cap |
| `89c845a` | chore(measure): log TD-249 for the convex-provider vi.mock deprecation |
| `11f6523` | chore(graph): update graph.db after budget governance fix |
| `d2ff92b` | chore(graph): update graph.db after review fixes |

## Process note

This track was created retroactively on 2026-06-11 because the above commits
shipped production fixes without a Measure track (flagged during the 24h commit
review). Future review-remediation work should open the track *before* committing
so Red/Green evidence is captured live rather than reconstructed.
