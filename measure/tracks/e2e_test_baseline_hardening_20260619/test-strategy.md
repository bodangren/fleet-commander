# Test Strategy: E2E Test Baseline Hardening

Tech-Lead strategy for `e2e_test_baseline_hardening_20260619`. Pairs with `spec.md` and `plan.md`. Keep concise; phases own the detail.

## 1. Build-Graph Findings That Shaped Strategy

- `graph.db` fresh (mtime ~2.5h); 5395 nodes / 7689 edges; no nodes for `setupMockApp` because `frontend/e2e/**` lives outside `tsconfig` graph scope. **Implication:** specs cannot be reasoned about via the graph; treat them as a parallel test asset and rely on filesystem audits.
- `playwright.config.ts:22` boots Vite with `VITE_CONVEX_URL=` empty and `VITE_SOURCE_*=bun` — the suite runs the **mock data adapter** path (`frontend/src/lib/dataAdapter.ts:55-61`), not real Convex. **Implication:** the plan’s "typed Convex client seed factory" is a category mismatch; the seed factory must target `mockApp.ts` (or replace it), not Convex. Surface this in Phase 1 and rewrite Phase 2 accordingly before coding.
- All 28 specs already import `setupMockApp` (grep confirmed); no `test.skip`/`test.fixme`/`@quarantine` markers exist. **Implication:** no current intentionally-red files leak into aggregate runs — but Phase 3 may introduce them. Pre-allocate the `@quarantine` grep enforcement before Phase 3 starts.

## 2. Architecture Guardrails

- No new schedulers, claimants, or timers (workflow rule).
- Seed factory lives under `frontend/e2e/helpers/` only. **No production import** of seed code from `frontend/src/**` or `pivot/src/**`. Doctor’s boundary check (`measure/doctor.sh:180`) covers cross-slice imports — verify it stays green.
- Do not edit `mockApp.ts` data shapes without a `dataAdapter.test.ts` contract update; mock and adapter share the type contract.
- Red-phase commits touch tests + Measure docs only (`red_phase_boundary` lesson). Defer `build-graph update` to Green/closeout.
- Fake harnesses are runner plumbing only (`fake_gate_mask` lesson) — every fake gate must be paired with a real targeted command below.

## 3. Shared Fixtures & Mocks

- **Canonical fixture entrypoint:** `frontend/e2e/helpers/seed.ts` (new). Exports `seedScenario(page, scenario: 'empty' | 'demo' | 'kanban-cards' | …)` and returns typed handles.
- **Builds on, does not replace, `mockApp.ts`** initially. `seedScenario` composes the existing `setupMockApp` route handlers and adds typed scenario presets. A later refactor may invert dependency once all specs migrate.
- **Idempotency contract:** running `seedScenario` twice in a worker yields the same observable state (asserted in Phase 2 contract test).
- **Isolation:** each spec gets its own `BrowserContext` (Playwright default); seed state is per-page, not global. No shared `beforeAll`.
- **Determinism levers:** fixed `Date.now()` injection via `page.addInitScript`, deterministic UUIDs via `crypto.subtle` mocking helper, bounded `await` waits on Convex-style subscription readiness selectors (`[data-realtime-ready="true"]`) instead of `waitForTimeout`.

## 4. Cross-Phase Edge Cases & Dependencies

- **Phase 1 → 2:** Phase 1 audit must record whether each failure is *adapter-mock drift* vs *selector drift* vs *race*. Phase 2 only addresses adapter-mock drift; the others are routed to Phase 3.
- **TD-250 swap (Phase 1 task 4):** Removing TD-250 outright loses traceability. Replace with classified items (e.g. TD-250a/b/c) and link each from the per-failure audit row.
- **Webserver reuse:** `playwright.config.ts:24` sets `reuseExistingServer: !CI`. Phase 3 stabilization must be re-run on a cold server (`pkill -f vite; npx playwright test`) before marking Phase 3 done — flakes hide behind warm caches.
- **Phase 4 doctor wiring:** Adding `npx playwright test` to `measure/doctor.sh` makes doctor depend on a running Vite server. Either gate behind `--with-e2e` flag or fail-fast on `curl localhost:5173`. Decision belongs in Phase 4 task 1.
- **Quarantine path:** if Phase 3 quarantines specs, they MUST be moved to `frontend/e2e/quarantine/**` (excluded by `playwright.config.ts` `testDir`/`testIgnore`) AND linked to a still-`[~]` task in `tech-debt.md`. Aggregate `npx playwright test` must not discover them.

## 5. Per-Phase Test Approach

### Phase 1 — Audit Baseline Failures
- **Approach:** non-fake. Capture `--reporter=json` output to a committed artifact under the track dir.
- **Contract test (artifact):** `frontend/e2e/scripts/e2e-baseline-audit.test.ts` (Vitest) parses the JSON artifact and asserts known-failure IDs, classification field, and TD pointer. This is an **artifact contract test, not a live behavior test**.
- **Live proof:** the `npx playwright test --reporter=json` invocation that produced the artifact, captured with timestamp.

### Phase 2 — Seed & Fixture Factory
- **Approach:** TDD on `seed.ts` via Vitest unit tests under `frontend/e2e/helpers/seed.test.ts` (idempotency, isolation, schema). Then a Playwright contract test that fails if any spec imports `setupMockApp` directly without going through `seedScenario`.
- **Live proof:** one targeted Playwright spec (`frontend/e2e/seed-factory-smoke.spec.ts`) that uses only `seedScenario` and exercises the `/portfolio` → `/project/:id` path.

### Phase 3 — Stabilize Critical-Path Specs
- **Approach:** per spec, write a Red Playwright test reproducing the flake (worker-isolated) before applying the fix. Use role-based selectors and subscription-ready data attributes; ban `waitForTimeout`.
- **Live proof:** targeted run per spec, then full suite cold-server run at end of phase.

### Phase 4 — Wire Into Quality Gate
- **Approach:** small shell-level command-construction proof for the doctor wiring (no full suite invocation), plus one bounded smoke run as the closeout gate.
- **Live proof:** doctor invocation runs `npx playwright test frontend/e2e/smoke.spec.ts` only; full-suite run is the track-completion gate.

## 6. Live-Proof Plan (Red & Green per Phase)

| Phase | Targeted Red command | Green / closeout gate |
|---|---|---|
| 1 | `bun --cwd frontend test --run e2e/scripts/e2e-baseline-audit.test.ts` (Red: artifact missing/malformed) | `cd frontend && npx playwright test --reporter=json > ../measure/tracks/e2e_test_baseline_hardening_20260619/baseline.json` then audit test passes |
| 2 | `bun --cwd frontend test --run e2e/helpers/seed.test.ts` (Red: idempotency/isolation fails) + `cd frontend && npx playwright test e2e/seed-factory-smoke.spec.ts` | Same two commands green; plus contract test `bun --cwd frontend test --run e2e/scripts/seed-factory-usage.test.ts` |
| 3 | `cd frontend && npx playwright test e2e/<spec>.spec.ts --repeat-each=3` per spec (Red: ≥1 of 3 fails) | Cold-server full suite: `pkill -f vite \|\| true && cd frontend && npx playwright test` — zero unexpected failures, no `@quarantine` outside `e2e/quarantine/**` |
| 4 | `bash measure/doctor.sh e2e --dry-run` (prints constructed command, exits 0) — **command-construction proof, not full suite** | `bash measure/doctor.sh all` green AND `cd frontend && npx playwright test` green on a clean checkout |

**Distinction:** Phase 1’s audit test and Phase 2’s usage-contract test are **artifact/documentation contracts** — they prove shape, not behavior. Phases 1 (Playwright JSON capture), 2 (seed-factory-smoke), 3 (per-spec + cold full suite), and 4 (doctor smoke + full suite) provide **live behavior proof**.

**Fake-gate guardrail:** the Phase 4 `--dry-run` is a command-construction proof. It must (a) print the exact `npx playwright test …` argv it would exec, (b) refuse to silently fall through to the full suite if `--dry-run` is omitted but the e2e env is missing, and (c) be paired with the bounded smoke spec in the doctor closeout gate so plumbing alone cannot mark the phase green.

## 7. Intentionally-Red Files Policy

- Today: none.
- If Phase 3 introduces any: place under `frontend/e2e/quarantine/**`, add `testIgnore: ['**/quarantine/**']` to `playwright.config.ts`, and create a `[~]` task under a new `tech-debt.md` entry that owns the file. Phase 3 closeout must `grep -r quarantine frontend/e2e --include='*.spec.ts'` and assert zero hits outside the excluded dir.
