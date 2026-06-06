# Plan: Review Remediation — Quality-Gate Green-Up

## Phase 1: Latent Type Bugs (TD-237)
- [x] Task: Characterize `convex/lib/insights.ts:77` — confirm `pointsEstimated` is not on the sprint doc; identify the intended field (e.g. derive from tasks' storyPoints). Write a failing test that exercises the code path.
- [x] Task: Fix the insights read to use a real schema field or remove it; test passes.
- [x] Task: Fix `convex/projects.ts:150` mutation export handler-signature mismatch; add/repair a test that imports it through the production path.
- [x] Task: Verify `bun --cwd pivot typecheck` no longer reports insights.ts:77 / projects.ts:150.

## Phase 2: Dashboard Test Failures (TD-239)
- [ ] Task: Reproduce the 4 red tests; determine whether the BurnForecastCard render bug is in the component or whether the tests encode a stale projectId contract.
- [ ] Task: Fix the root cause (component or test) — prefer fixing the component if behavior is wrong; only adjust tests if they assert an obsolete contract, and document why.
- [ ] Task: `bun --cwd frontend test` shows 0 failures attributable to dashboard/burn-forecast.

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
