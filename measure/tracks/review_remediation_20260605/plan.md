# Plan: Review Remediation — Quality-Gate Green-Up

## Phase 1: Latent Type Bugs (TD-237)
- [x] Task: Characterize `convex/lib/insights.ts:77` — confirm `pointsEstimated` is not on the sprint doc; identify the intended field (e.g. derive from tasks' storyPoints). Write a failing test that exercises the code path.
- [x] Task: Fix the insights read to use a real schema field or remove it; test passes.
- [x] Task: Fix `convex/projects.ts:150` mutation export handler-signature mismatch; add/repair a test that imports it through the production path.
- [x] Task: Verify `bun --cwd pivot typecheck` no longer reports insights.ts:77 / projects.ts:150.

## Phase 2: Dashboard Test Failures (TD-239)
- [~] Task: Reproduce the 4 red tests; determine whether the BurnForecastCard render bug is in the component or whether the tests encode a stale projectId contract.
  - **Red-phase characterization (2026-06-06)**: All 4 tests reproduced via `npx vitest run src/hooks/useDashboardData.test.ts src/pages/DashboardPage.layout.test.tsx`. Classification:
    1. `useDashboardData.test.ts > "calls useConvexQuery with dashboard:getDashboardDataHandler"` — **stale contract**. The test asserts `{ projectId: '' }` but `useDashboardData` (frontend/src/hooks/useDashboardData.ts:78) now passes `{ projectId: projectId ?? undefined }`. The implementation contract is the newer one; the test encodes the pre-refactor expectation.
    2. `DashboardPage.layout.test.tsx > "renders all 5 dashboard sections when data is available"` — **component-bug + mock-fixture-bug (hybrid)**. The mock provider in `frontend/src/__fixtures__/convex-provider.tsx:201-211` maps `dashboardSprint → sprint` but drops `burnRate`, `projectedExhaustionMs`, `atRisk`, `forecastConfidence` from the `mockSprint` fixture (which has them at `frontend/src/__fixtures__/dashboardFixtures.ts:23-26`). `DashboardPage` then forwards `undefined` to `BurnForecastCard`, which calls `formatCurrency(undefined)` → `Cannot read properties of undefined (reading 'toFixed')` at `frontend/src/components/dashboard/BurnForecastCard.tsx:81`. Per test-strategy §1 ("prefer fixing the component if behavior is wrong; only adjust tests if they assert an obsolete contract"), the component should be defensive; the mock-provider mapping should also be repaired so the test mirrors the production fixture shape.
    3. `DashboardPage.layout.test.tsx > "arranges sections in a grid layout container"` — same root cause as (2); crashes during render before assertion.
    4. `DashboardPage.layout.test.tsx > "renders responsive grid classes on the layout container"` — same root cause as (2); crashes during render before assertion.
  - **Files added in Red phase** (no source changes, no test fixes yet — only characterization scaffolding):
    - `frontend/src/components/dashboard/BurnForecastCard.test.tsx` (new component unit test, per test-strategy §1 row 2). Locks down the `BurnForecastCard` contract in isolation; some assertions exercise the parent-projection shape and fail with the same `toFixed` crash, isolating the component vs. the layout bug class.
  - **Per-field crash-point isolation (2026-06-06)** — commit pending: the "all undefined" repro above does not isolate which `formatCurrency` call crashes. Added 3 granular tests in `BurnForecastCard.test.tsx` that null out one field at a time and assert the component does not throw. **Confirmed failure surface** (all FAIL with `TypeError: Cannot read properties of undefined (reading 'toFixed')`):
    - `burnRatePerHour: undefined` only → crashes at `BurnForecastCard.tsx:81` (`formatCurrency(forecast.burnRatePerHour)`).
    - `remainingBudget: undefined` only → crashes at `BurnForecastCard.tsx:139` (`formatCurrency(forecast.remainingBudget)`).
    - `confidence: undefined` only → **does NOT crash** (passes today), but renders "NaN%". The Green-phase implementer should still decide whether to display a graceful fallback here; this is a *quality* bug, not a *crash* bug, so the test asserts only the heading is present (no `toThrow` lock) to avoid over-constraining the fallback value.
    The two crash points are the Green-phase fix sites. Per the test-strategy §1 row 2 guideline ("prefer fixing the component if behavior is wrong"), the implementer should make `BurnForecastCard.tsx` defensive at lines 81 and 139, and the exact fallback value is a design decision left to the Green phase.
- [ ] Task: Fix the root cause (component or test) — prefer fixing the component if behavior is wrong; only adjust tests if they assert an obsolete contract, and document why. *(Green phase — deferred to implementer per TDD split.)*
- [ ] Task: `bun --cwd frontend test` shows 0 failures attributable to dashboard/burn-forecast. *(Acceptance gate — runs after Green phase.)*

## Phase 3: as-any Guard Repair (TD-236)
- [ ] Task: Define one canonical allowlist line format in `as-any-allowlist.txt` (`path-glob:content-substring:reason`); migrate the existing inconsistent entries.
- [ ] Task: Implement the matcher in `doctor.sh::check_as_any` (glob path + substring), with a negative test proving a non-allowlisted cast still FAILs and an allowlisted one passes.
- [ ] Task: Confirm `doctor.sh as-any` honors the file (report count drops to only un-triaged casts; no fake bulk-baseline).

## Phase 4: Green-Gate Verification (FR4, FR5)
- [ ] Task: Confirm provider_health_resilience has landed TD-235 + fallback-test typing (coordination checkpoint; if not, record the blocking error count).
- [ ] Task: Confirm project_template_marketplace has landed TD-238 (or record it as the remaining frontend failure).
- [ ] Task: Run and record results: `bun --cwd pivot test`, convex suite, `bun --cwd frontend test`, `bun --cwd pivot typecheck`, `bash measure/doctor.sh all`.
- [ ] Task: Update `build-graph` for all changed files.
- [ ] Task: Commit and push.
