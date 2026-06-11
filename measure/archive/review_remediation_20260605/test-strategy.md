# Test Strategy: Review Remediation — Quality-Gate Green-Up

## 1. Testing Pyramid Per Phase

| Phase | Unit | Integration | E2E | Notes |
|---|---|---|---|---|
| 1 (TD-237 latent type bugs) | **HEAVY** — Vitest unit tests in `convex/lib/insights.test.ts` and `convex/projects.test.ts` driving the real exported function | Light — `convex-test` round-trip for the mutation through the production export | None | Tests must import via the **production path** (the registered mutation export), not direct handler refs — that is exactly what hid `projects.ts:150`. |
| 2 (TD-239 dashboard) | Component unit (`BurnForecastCard.test.tsx`) + hook unit (`useDashboardData.test.ts`) using existing RTL setup | Layout test (`DashboardPage.layout.test.tsx`) verifying card composition + projectId plumbing | None | Decide root cause **before** editing; classify each red test as *component-bug* or *stale-contract* and document in the plan. |
| 3 (TD-236 doctor guard) | **HEAVY** — bash-level tests (bats or `bun:test` shelling out) for `check_as_any`: matrix of `{matching glob, matching substring, non-matching, malformed line, comment, blank}` | One smoke test running `doctor.sh as-any` against a tmp repo with a seeded violation + allowlist entry | None | Must include a *negative* test (non-allowlisted cast still FAILs) per FR3. |
| 4 (FR4/FR5 gate verification) | None new | Run aggregate suites + `doctor.sh all` as the test | None | Acceptance is "the gates run green," recorded in the plan with exit codes. |

## 2. Shared Fixtures & Mocks

- **Reuse, do not duplicate**: `frontend/src/__fixtures__/dashboardFixtures.ts` and `insightsFixtures.ts` already export 5+ entities (per `build-graph files`). Phase 2 tests MUST extend these, not create parallel fixtures.
- **Convex tests**: use existing `convex/__fixtures__/foundation.ts` (39 entities) for seeding sprints/projects. Phase 1's insights test should seed a sprint **without** `pointsEstimated` to lock the bug-class.
- **Doctor tests (Phase 3)**: create a `measure/__fixtures__/as-any-cases/` directory of tiny `.ts` snippets; tests copy them into a temp tree so production `doctor.sh` runs unmodified.
- **No `mock.module()` in any new test** — TD-228 burned us; prefer fixture injection or `convex-test` harness.

## 3. Cross-Phase Edge Cases & Dependencies

- **Schema/field drift (Phase 1 ↔ Phase 2)**: if Phase 1 removes `pointsEstimated` from the read, any dashboard hook that surfaces sprint insights must be re-asserted in Phase 2. Add one cross-phase test in `useDashboardData.test.ts` reading the insights response shape.
- **Allowlist format migration (Phase 3)**: current header documents `file_path:line_number:reason` but the spec mandates `path-glob:content-substring:reason`. The matcher test MUST cover **both formats during the migration window** OR the test for the new format MUST run only after `measure/as-any-allowlist.txt` is migrated in the same task.
- **Phase 4 depends on external tracks (TD-235, TD-238)**. The verification script must distinguish "owned-by-us failure" from "external blocking failure" and report counts separately — do not gate the whole track on un-owned errors.
- **`projects.ts:150` handler-signature edge**: handler is defined inline as `mutation({...})` then re-referenced (line 127 vs 150). Test must exercise the `updateProjectRoutingPolicy` export path to catch this style of duplication.

## 4. Architecture Guardrails

- **No new `as any`** introduced by any phase (Phase 3 will start failing the gate once fixed — verify locally before commit).
- **Convex public functions** in Phase 1 keep `args` + `returns` validators (per `convex/_generated/ai/guidelines.md`).
- **No edits to feature tracks' files** (TD-235 in `providers/`, TD-238 in `SaveAsTemplateModal`) — out of scope per spec.
- **`doctor.sh` stays POSIX-ish bash**; do not introduce a JS rewrite.
- **Run `build-graph update ./graph.db <files>` after each task** that touches TS — graph staleness will hide Phase-1-style bugs in the next track.

## 5. Per-Phase Test Approach Notes

- **Phase 1**: Write the failing test first (TDD). For `insights.ts:77`, seed a sprint doc missing `pointsEstimated`; assert the returned object's points field has a defined source. For `projects.ts:150`, import `api.projects.updateProjectRoutingPolicy` (generated client) and call it through `convex-test` — this both reproduces the typecheck failure and locks the wire contract.
- **Phase 2**: Run the 4 red tests in isolation first (`bun --cwd frontend test -t BurnForecast`). For each failure, capture render output + props snapshot before changing anything. Only mark a test "stale contract" if it asserts a removed prop/field; otherwise the component is wrong.
- **Phase 3**: Build the matcher with TDD against a hand-built fixture set, then run it against the real `as-any-allowlist.txt`. The negative test ("non-allowlisted cast still FAILs") is the acceptance lock; without it the guard regresses silently.
- **Phase 4**: Treat as a recording phase, not a coding phase. Capture full command output (stdout + exit code) for each of the 5 gates; paste counts (pass/fail/error) into the plan task notes. Distinguish track-owned vs blocking-external failures.

## 6. Build-Graph Findings That Shaped This Strategy

- `build-graph stats`: 4,690 nodes / 6,590 edges / 618 files across packages `pivot` (187), `frontend` (167), `convex` (61), root (203). Codebase large enough that **import-path testing matters** — many same-named files (3 `insights.ts`, 2 `burnForecast.ts`) → tests must reference full paths.
- `build-graph search "insights"` confirmed `convex/lib/insights.ts` is distinct from `convex/insights.ts` and `frontend/.../insights.ts`; **Phase 1 fix lives only in `convex/lib/insights.ts`** — do not edit the others.
- `build-graph search "BurnForecast"` showed `computeBurnForecast` (convex/lib) and `BurnForecastCard` (frontend); they are decoupled, so Phase 2 likely needs only frontend-side fixes. Confirmed `BurnForecastCard.test.tsx` is not yet in graph — fixtures-only currently.
- `build-graph search "allowlist"` and `"doctor"` returned **zero production matches** — `doctor.sh` is shell and outside the graph. Phase 3 tests cannot be graph-driven; must use shell test harness.
- `build-graph files` showed orphan files (`./convex/burnForecast.ts`, `./convex/insights.ts`, `./convex/projects.ts` all show 0 functions in the graph) → graph appears **slightly stale for `convex/` top-level files**. Recommend `build-graph scan ./ ./graph.db` before Phase 4 verification so review can run a clean caller-check.
- `updateProjectRoutingPolicyHandler` is declared at line 127 as a full `mutation({...})` then re-passed at line 150 — a duplication bug, not a missing function. Phase 1's test must call the exported `updateProjectRoutingPolicy`, not the handler symbol, to reproduce.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: review_remediation_20260605
phase: track setup
commits: none
tests_run: none (strategy-only deliverable)
files_changed: measure/tracks/review_remediation_20260605/test-strategy.md (new)
plan_updates: none (strategy is a sibling artifact; plan.md untouched)
known_failures: none
handoff: Implementer should (a) run `build-graph scan ./ ./graph.db` before Phase 4 because top-level convex/* files showed 0 entities (graph stale for that subdir), (b) write tests via the production export path for the `convex/projects.ts:150` fix to reproduce the handler-duplication bug, (c) extend existing fixtures in `__fixtures__/` rather than create new ones, and (d) include a negative test in Phase 3 proving non-allowlisted casts still FAIL. Spec out of scope: TD-235, TD-238, and the 191-cast triage.
END_MEASURE_AGENT_RESULT
