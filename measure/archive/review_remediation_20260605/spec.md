# Spec: Review Remediation — Quality-Gate Green-Up

## Problem

A 2026-06-05 review session found that the project's quality gates have been
quietly red while tracks closed out citing "pre-existing failures":

- The aggregate **pivot suite** was 1021 pass / **18 fail** — caused by
  `mock.module()` leakage in `providerHealthMonitor.test.ts` (TD-228, now
  fixed: 1039/0). The lesson: per-file-green / aggregate-red was normalized.
- **`bun --cwd pivot typecheck` has 8 errors**: a missing `fallbackEvents`
  table (now fixed, −3), `providers.status` enum overload (TD-235, owned by
  provider_health), 4 fallback-test typing errors (provider_health), and two
  latent bugs unrelated to any track (TD-237).
- The **frontend suite** has 6 red tests: 2 from an orphaned
  `SaveAsTemplateModal` (TD-238, owned by project_template_marketplace) and 4
  dashboard/BurnForecastCard failures long dismissed as "pre-existing"
  (TD-239).
- `doctor.sh`'s **as-any guard never reads its allowlist** and the allowlist
  format is internally inconsistent (TD-236), so the gate is permanently red
  with no working exemption path.

This track owns the cross-cutting fixes that are not the responsibility of an
active feature track, and coordinates a single acceptance bar: **every gate
green**.

## Functional Requirements

- **FR1 (TD-237):** `convex/lib/insights.ts:77` must stop reading the
  non-existent `sprint.pointsEstimated`; derive from the real schema field or
  remove the read. `convex/projects.ts:150` mutation export must typecheck.
- **FR2 (TD-239):** The 4 red dashboard tests (`useDashboardData.test.ts`,
  `DashboardPage.layout.test.tsx`) must pass — fix the BurnForecastCard render
  / projectId mismatch, or correct the tests if they encode stale contracts.
- **FR3 (TD-236):** `doctor.sh::check_as_any` must read `as-any-allowlist.txt`.
  First pin a single allowlist line format (`path-glob:content-substring:reason`),
  migrate existing entries to it, then implement the matcher. Do **not**
  bulk-baseline the 191 current casts — triage is out of scope here; the guard
  must simply honor entries that exist.
- **FR4:** `bun --cwd pivot typecheck` reaches **0 errors** once TD-235 and the
  fallback-test typing land (provider_health) and FR1 lands here. This track
  tracks the gate; the provider-owned errors are referenced, not duplicated.
- **FR5 (acceptance gate):** A documented, runnable command sequence
  (`pivot test`, convex tests, `frontend test`, `pivot typecheck`,
  `doctor.sh all`) is all-green, and the result is recorded in the plan.

## Out of Scope

- Triaging/removing the 191 `as any` casts (separate: typed_convex_boundary track).
- TD-235 provider status enum (owned by provider_health_resilience).
- TD-238 Save-as-Template wiring (owned by project_template_marketplace).
- Any new feature behavior.

## Cross-References

- Blocks full green gate: TD-235 (provider_health_resilience),
  TD-238 (project_template_marketplace).
- Owns: TD-236, TD-237, TD-239.
