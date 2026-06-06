# Test Strategy: Package Dependency Upgrades & Security Remediation

This track is a **dependency-risk-managed change**, not a feature build. The
strategy treats every command (`bun outdated`, `bun audit`, `npm run verify`)
as the contract. Tests confirm behaviour did not regress against the Phase 1
baseline; no new product behaviour is introduced.

## Testing Pyramid Per Phase

| Phase | Unit | Integration | E2E / Smoke | Baseline diff |
| --- | --- | --- | --- | --- |
| 1 Baseline | n/a | n/a | full `verify` snapshot | **establishes baseline** |
| 2 Compat verification | identify gaps in unit coverage for routing, Vite build, Convex codegen | run pivot vitest + frontend vitest in worktree | one Playwright smoke (`smoke.spec.ts`) | dry run |
| 3 Compat upgrades | pivot + frontend vitest per-workspace | Convex codegen + `convexClient` round-trip | `dashboard.spec.ts`, `fleet-status.spec.ts` | **must match baseline** |
| 4 Residual + majors | targeted unit suites per major (router/vite/tailwind/ts) | typecheck + lint per major | full Playwright suite per retained major | per-major checkpoint |
| 5 Closeout | n/a | full pivot + frontend + lint + verify | full Playwright e2e | final delta recorded |

## Shared Test Fixtures & Mocks

Reuse existing fixtures; do **not** create dependency-test-only fixtures:

- `pivot/src/__fixtures__/convex-mock.ts` — Convex client mock; exercises the
  `convex` upgrade boundary across pivot.
- `frontend/src/__fixtures__/convex-provider.tsx` — React 19 + ConvexProvider
  smoke surface; touched by React Router 6→7 and React upgrades.
- `frontend/src/__fixtures__/insightsFixtures.ts` — largest data fixture (42
  entities); exercises XYFlow, tailwind-merge, lucide-react rendering paths.
- Playwright helpers in `frontend/e2e/helpers/` — single source for navigation
  flows; sufficient for router migration smoke.
- For `bun-types` / Bun runtime drift, prefer `bun --version` capture over
  mocking; record in baseline file, not test code.

## Cross-Phase Edge Cases & Dependencies

- **convex alignment (FR-4):** root, pivot, and frontend all declare `convex`.
  Test must include `pivot/src/convexClient.test.ts`,
  `pivot/src/convexRetry.test.ts`, `pivot/src/sync/convexAgentSync.test.ts`,
  and `pivot/src/routes/typed-convex-boundary.test.ts` after every convex bump.
- **js-yaml alignment (FR-4):** consumers are `pivot/src/harness/loader.ts`,
  `pivot/src/pipeline/loader.ts`, `pivot/src/environment/types.ts`,
  `pivot/src/policy/weightPresets.ts`, and `frontend/src/lib/analysis.ts`.
  Both workspaces must be upgraded in the same commit.
- **React Router 6 → 7 (Phase 4):** `frontend/src/App.tsx` wraps
  `BrowserRouter`; `frontend/src/components/history/TaskTimelineLink.tsx` uses
  router links; 28 Playwright specs depend on navigation. Run the full e2e
  suite, not a subset, for the router checkpoint.
- **Vite 7 → 8 / PWA:** no `registerSW` symbol exists in the graph, so PWA
  verification must come from the build artifact (`frontend/dist/`
  manifest + service-worker file presence), not a unit test.
- **Tailwind 3 → 4:** no programmatic symbols; verify via visual smoke
  (Playwright `responsive.spec.ts`) and `frontend check`.
- **TypeScript 6:** must pass `bun --cwd pivot typecheck` and
  `bun --cwd frontend check`, plus Convex generated types under
  `convex/_generated/`.
- **Bun runtime alignment (FR-3):** `packageManager` and `bun-types` must move
  together; pivot tests are the regression net.

## Architecture Guardrails

- No new source files. Tests are characterization only; use existing suites.
- No `as any` casts to silence type errors from `@types/*` bumps
  (lesson: `as_any_mask`).
- No `bun audit --ignore` blanket suppression; per FR-9 each residual finding
  is documented in `plan.md`, not in config.
- No `npm install` / `npm ci` — bun only (`AGENTS.md`).
- No edits under `frontend/dist/`, `pivot/dist/`, `convex/_generated/` except
  via `npx convex codegen`.
- Each major upgrade is its own commit; never grouped with another major
  (NFR §76). Each commit must independently pass `npm run verify`.
- Apply the `red_not_done` lesson: only mark a task `[x]` when its gate is
  actually green at HEAD, not when "the upgrade applied cleanly".

## Per-Phase Test Approach Notes

- **Phase 1:** capture verbatim outputs in a baseline artifact inside the track
  dir; every later phase diffs against this file. No code runs.
- **Phase 2:** run suites in a worktree; if any test in `convexClient`,
  `router.test.ts`, or `coverage.spec.ts` lacks coverage for the upgrade
  surface, *flag it* in plan.md — do not write speculative tests.
- **Phase 3:** after each workspace's compatible batch, run that workspace's
  vitest + the cross-workspace `typed-convex-boundary.test.ts`. One Playwright
  smoke (`smoke.spec.ts`) gates the batch.
- **Phase 4:** each major gets its own gate set. Router 7 → full e2e. Vite 8 →
  `frontend test` + `build` + manifest check. TS 6 → typecheck triplet + Convex
  codegen. ESLint 10 → `npm run lint` + plugin compatibility. Defer + document
  any major that fails after one good-faith migration pass.
- **Phase 5:** the closeout gate is the *exact* command list in FR-1 / AC-7;
  diff against the Phase 1 baseline. Run `build-graph update` only for changed
  `.ts`/`.tsx` files (per `build_graph_audit_timeout` lesson — never `audit`).

## build-graph Findings That Shaped This Strategy

- `stats`: 4823 nodes / 605 files across 4 packages (pivot 258, frontend 226,
  convex 89, root 32). Confirms three independent workspaces — strategy
  requires per-workspace gates, not a single root gate.
- Top imports: `router.ts` (54), `validators.ts` (47), `auth.ts` (39). The
  router file is the highest-blast-radius surface; this is why React Router 7
  gets the full e2e suite, not a subset.
- `search "convex"`: 15 production files + tests reference convex; convex
  upgrades touch sync, retry, client, fixtures, and boundary tests
  simultaneously — they must run as one gate batch.
- `search "yaml"`: 6 distinct loaders consume js-yaml across pivot + frontend;
  justifies the cross-workspace alignment requirement in Phase 3.
- `search "PWA"` / `"registerSW"` / `"service-worker"`: **no matches**. PWA
  behaviour is config-only, so Vite-PWA verification must be artifact-based,
  not symbol-based.
- `callers ConvexProvider`: ambiguous (frontend impl + external module). The
  React-Router-7 + React upgrade gate must validate both the local provider
  and its external binding via existing `convex-provider.tsx` fixture.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: package_dependency_upgrades_20260607
phase: track setup
commits: none
tests_run: build-graph stats ./graph.db (pass); build-graph search/callers (informational)
files_changed: measure/tracks/package_dependency_upgrades_20260607/test-strategy.md (new)
plan_updates: none (strategy doc added alongside plan.md/spec.md)
known_failures: none
handoff: Implementer should treat Phase 1 baseline file as the contract; per-workspace gates required for convex/js-yaml alignment; React Router 7 needs full Playwright e2e (28 specs depend on router); Vite-PWA verification must be artifact-based (no SW symbols in graph); never group two majors in one commit.
END_MEASURE_AGENT_RESULT
