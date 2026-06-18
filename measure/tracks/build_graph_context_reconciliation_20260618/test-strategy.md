# Test Strategy: Build Graph And Context Reconciliation

This is a **doc + governance** track. There is no production code change. Most "tests"
are artifact/contract assertions on Markdown, JSON metadata, and a freshly-rebuilt
`graph.db`. A small set of **live-behavior** checks prove that `build-graph` and
`measure/doctor.sh` actually run against the new artifacts (not just that the files
look right). No fake harnesses are introduced — the existing runners (`build-graph`,
`doctor.sh`, `wc`) are real, bounded, and used directly.

## 1. Testing Pyramid Per Phase

| Phase | Unit / artifact | Integration / contract | Live smoke |
| --- | --- | --- | --- |
| 1 Context Repair | line-count assertions, link-presence checks | grep for retired terms (scheduler/human-review/architecture.json) | `head` rendering of `index.md` |
| 2 Track Registry Cleanup | per-track `metadata.json` parse | tracks.md ↔ filesystem ↔ metadata three-way diff | `ls measure/archive/` contains the 4 closed tracks |
| 3 Safe Graph Rebuild | temp-DB existence, byte-size sanity | `build-graph stats` row counts ≥ baseline; backup file exists | `build-graph stats ./graph.db`, `build-graph audit ./graph.db --json` |
| 4 Governance Verification | `wc -l` thresholds | doctor allowlist drift | `bash measure/doctor.sh all` exit 0 |

Pyramid intentionally inverted vs. typical apps: artifact tests dominate, live smoke is
the apex (one bounded command per phase), and there are no unit-level production tests
because no production code is touched.

## 2. Shared Fixtures & Mocks

- **Baseline graph stats** captured before Phase 3 (`5676 nodes, 7998 edges, 710 files`,
  packages: pivot 266 / frontend 222 / root 146 / convex 76) — used as the lower-bound
  sanity check after rebuild.
- **Backup path:** `graph.db.backup-20260618` (Phase 3 produces it; Phase 3 final task
  consumes it on rollback).
- **Temp DB path:** `/tmp/fleet-commander.graph.db` (spec §Verification).
- **Audit JSON snapshot:** stored inline in `plan.md` Phase 3 final task as evidence;
  no checked-in fixture file (avoid graph drift).
- No mocks. `build-graph` and `doctor.sh` are invoked against real artifacts.

## 3. Cross-Phase Edge Cases & Dependencies

- **Phase 1 → Phase 4:** `index.md` and `lessons-learned.md` edits must keep
  `wc -l ≤ 50`; doctor's god-file/orphan checks consume `graph.db`, so Phase 1 must
  finish *before* Phase 3 rebuild for any docs that the graph actually indexes.
- **Phase 2 → Phase 3:** archiving stale tracks moves files; rebuild **must** happen
  *after* archive moves, otherwise the new `graph.db` will re-introduce missing-file
  audit entries for the old paths (this is exactly the failure mode in `index.md`).
- **Phase 3 atomicity:** temp-DB write → success-check → swap. If `build-graph scan`
  fails (the `UNIQUE constraint failed: nodes.id` regression cited in `index.md`),
  canonical `graph.db` MUST remain untouched.
- **Phase 3 audit timeout:** `build-graph audit --json` did not return within 60s
  during strategy probing on the current 5676-node DB. Plan tasks must use an explicit
  long timeout (≥ 5 min) and capture only summarized counts, not full lists.
- **Phase 4 doctor depends on Phase 3 graph:** `check_boundary` and `check_orphans`
  SKIP if `graph.db` is missing — gate must assert exit 0 *and* absence of `SKIP` for
  those two checks.
- **Intentional reds:** none in this track. The deleted `*.red.test.ts` files cited in
  `spec.md` are the *cause* of stale graph entries — Phase 3 rebuild eliminates them.
  No new red files are created. If Phase 2 archives a track whose plan still has `[~]`
  tasks, that track stays unarchived and is owned by its own track folder.

## 4. Architecture Guardrails

- Do **not** edit `measure/automation-supervisor.py` (AGENTS.md hard rule).
- Do **not** mutate `graph.db` outside Phase 3's temp-then-swap dance.
- Do **not** add new generated artifacts under `measure/generated/` unless a generator
  is also committed; otherwise update `index.md` to mark them unavailable (matches
  current §Architecture & Facts language).
- Doc edits stay inside `measure/`; no source files in `pivot/`, `frontend/`, or
  `convex/` are modified, so `npm run lint`, vitest, and Playwright are out of scope.

## 5. Per-Phase Test Approach Notes

- **Phase 1:** grep for the retired strings `architecture.json`, `generate.sh`,
  `scheduler`, `human-review` in the four context docs. Any hit that is not
  explicitly an "unavailable / retired" annotation fails the phase.
- **Phase 2:** for each of the four named stale tracks plus
  `build_graph_context_reconciliation_20260618` itself, assert
  (a) `metadata.json.status` matches archive vs active, (b) presence in `tracks.md`
  matches filesystem location, (c) `plan.md` has zero `[~]` tasks before archiving.
- **Phase 3:** record `build-graph stats` *before* and *after* swap. Post-swap node
  count must be ≥ 95% of pre-swap (allow drop from removed `.red.test.ts` files but
  reject catastrophic loss). Audit JSON `missing_files` count must be **0** for paths
  matching `frontend/src/AppRoutes.tsx`, `*.red.test.ts`, and `measure/tracks/...`.
- **Phase 4:** `doctor.sh all` must exit 0. Capture stdout and assert each of the six
  checks emits `PASS` (not `SKIP`, not `FAIL`). Allowlist files under `measure/` are
  fixtures of record — do not trim them in this track.

## 6. Build-Graph Findings That Shaped Strategy

- `build-graph stats` ran cleanly: 5676 nodes / 7998 edges / 710 files; package split
  is pivot 266, frontend 222, root 146, convex 76 — Phase 3 baseline.
- `build-graph search "scheduler"` shows live `PolicyStatsScheduler`,
  `RetrospectiveScheduler`, `convex/scheduler.ts`, and `noSecondScheduler.test.ts`.
  The "retired scheduler" mentioned in `index.md` is the *human-review/agent-execution
  scheduler* (already removed), not these. Phase 1 doc edits must be precise to avoid
  deleting language about still-live components.
- `build-graph search "doctor"` returns only `runDoctorCheck` in
  `pivot/src/orchestrator/td206_close_debt.test.ts` — `measure/doctor.sh` is a Bash
  script and is **not** indexed. Phase 4 verification can therefore not rely on graph
  edges for `doctor.sh`; it must run the script directly.
- `build-graph audit --json` did not finish within 60s in probing — confirms spec's
  "explicit long timeout" requirement.

## 7. Live-Proof Plan (Red → Green Per Phase)

Each phase pairs a **Red** (failing-now) command with a **Green/closeout** gate. All
commands target the real artifact; no fake runners, no aggregate `*.test.ts` discovery
is involved (this track adds zero `.test.ts` files).

| Phase | Red command (must fail before work) | Green / closeout gate (must pass after) |
| --- | --- | --- |
| 1 | `grep -nE 'architecture\.json\|generate\.sh\|human-review' measure/index.md measure/product.md measure/workflow.md measure/tech-stack.md` returns ≥1 non-annotated hit | same `grep` returns only annotated/"unavailable" lines; `wc -l measure/lessons-learned.md measure/tech-debt.md` both ≤ 50 |
| 2 | `bash -c 'for d in measure/tracks/*/; do jq -r .status "$d/metadata.json" 2>/dev/null; done' \| grep -c complete` ≠ count in `tracks.md` "Completed" section | three-way diff (filesystem vs `tracks.md` vs `metadata.json.status`) is empty; the four named stale tracks live under `measure/archive/` |
| 3 | `build-graph audit ./graph.db --json --timeout 300` lists ≥1 missing file matching `AppRoutes.tsx\|\.red\.test\.ts\|measure/tracks/` | `build-graph scan ./ /tmp/fleet-commander.graph.db` exit 0 → swap → `build-graph stats ./graph.db` shows ≥ 0.95× baseline nodes → `build-graph audit ./graph.db --json` reports `missing_files: []` for the three patterns above |
| 4 | `bash measure/doctor.sh all` exits non-zero **or** any check prints `SKIP` for boundary/orphans | `bash measure/doctor.sh all` exits 0 and stdout shows `PASS` for all six checks; `wc -l measure/lessons-learned.md measure/tech-debt.md` both ≤ 50 |

These gates are bounded (each is a single CLI invocation with explicit timeout where
needed) and cannot fall through into a full vitest/Playwright suite — none of them
invoke a test runner. Fake harnesses are not used anywhere in this track.
