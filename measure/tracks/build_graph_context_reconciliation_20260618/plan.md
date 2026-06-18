# Plan: Build Graph And Context Reconciliation

## Phase 1: Context Repair

- [~] Task: Remove or correct missing links in `measure/index.md`.
- [~] Task: Update product/workflow/tech-stack/current-directive docs for the current Bun orchestrator, Convex source of truth, React Router 7 frontend, and quality workflow reality.
- [~] Task: Keep lessons and tech-debt registries under 50 lines.

### Phase 1 Red evidence (2026-06-18, MID role)

Phase 1 is a doc/governance phase; per test-strategy.md §1 the deliverable IS
the artifact set, so the Red assertions are bounded `grep` / `wc` / `cat`
checks against the Measure context files (no fake harness, no vitest, no
Playwright, no `graph.db` writes — per test-strategy.md §4 the graph
rebuild is Phase 3 work). The test file follows the sibling
`measure/tests/phase5-doc-updates.test.sh` style.

Targeted Red command (bounded, no watch, no full-suite smoke):

```
$ bash measure/tests/phase1-context-repair.test.sh
==> index.md: no unannotated architecture.json / generate.sh references
    PASS  (1 annotated, 0 unannotated)
==> product.md: Kanban table has no stale 'scheduler' column moves
    FAIL  (lines 58, 59 — Ready "waiting for scheduler", In Progress "Scheduler (auto)")
==> product.md: Runtime Architecture has no 'cron scheduler' phrasing
    FAIL  (line 132 — "Local HTTP server + cron scheduler for task execution")
==> context docs: no retired human-review phrasing
    PASS
==> workflow.md: names pivot/src/orchestrator/autoRunner.ts as canonical scheduler
    PASS
==> tech-stack.md: names React Router 7 (data-router) frontend router
    PASS
==> product.md: Quality Workflow notes the quality_workflow_hot_path_wiring_20260618 remediation
    PASS
==> lessons-learned.md ≤ 50 lines
    PASS  (35/50)
==> tech-debt.md ≤ 50 lines
    PASS  (33/50)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  9 tests: 7 passed, 2 failed
  FAILED:
    - product.md: Kanban table has no stale 'scheduler' column moves
    - product.md: Runtime Architecture has no 'cron scheduler' phrasing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Fail count: **2** (both pinned to missing/wrong content in `measure/product.md`,
not stale durable records). The 7 passing assertions confirm that the
non-product.md doc WIP in the worktree is on the right track; only product.md
still needs the Kanban + Runtime Architecture fixes to land.

Graph context (per build-graph): 5676 nodes / 7998 edges / 710 files
(baseline captured in test-strategy.md §2). `build-graph search scheduler`
returns the still-live `PolicyStatsScheduler` and `RetrospectiveScheduler`
classes plus the `noSecondScheduler.test.ts` guard; the Red contract targets
the retired human-review/agent-execution wording in product.md, not these
live components, so there is no false-positive risk. `build-graph update`
for any Phase 1 doc changes is deferred to Phase 4 per test-strategy.md §3
(no graph writes in Red phase).

No production code was modified. The dirty WIP doc edits for product.md
(and the other Phase 1 docs) remain unstaged so the Green role can commit
them atomically with the live-gate confirmation.

## Phase 2: Track Registry Cleanup

- [ ] Task: Reconcile `measure/tracks.md` against every unarchived track's metadata and plan completion state.
- [ ] Task: Archive or mark complete the four stale unarchived completed tracks: orchestrator decomposition, package dependency upgrades, settings page refactor, and configurable quality workflow integration.
- [ ] Task: Confirm new remediation tracks are listed under the correct planned review section.

## Phase 3: Safe Graph Rebuild

- [ ] Task: Preserve a backup of the current `graph.db`.
- [ ] Task: Run `build-graph scan ./ /tmp/fleet-commander.graph.db`.
- [ ] Task: If the temp scan fails, document the failure and keep the existing graph.
- [ ] Task: If the temp scan succeeds, replace `graph.db` and run `build-graph stats`.
- [ ] Task: Run `build-graph audit ./graph.db --json` with an explicit long timeout and store summarized evidence in this plan.

## Phase 4: Governance Verification

- [ ] Task: Run `bash measure/doctor.sh all`.
- [ ] Task: Run `wc -l measure/lessons-learned.md measure/tech-debt.md`.
- [ ] Task: Update AGENTS/Measure guidance only if the graph rebuild workflow changes the required daily process.
- [ ] Task: Run `build-graph update ./graph.db` for changed context files if the graph includes Measure docs.
