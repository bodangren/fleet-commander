# Plan: E2E Test Baseline Hardening

## Phase 1: Audit Baseline Failures

- [~] Task: Run `npx playwright test` and capture the full failure report with categories. *(MID Red: live evidence capture deferred to Green/closeout per test-strategy §5 "Live proof".)*
- [~] Task: Add a `scripts/e2e-baseline-audit.test.ts` contract test that asserts the audit report shape and known-failure IDs. *(MID Red: test scaffolded at `frontend/src/__tests__/e2e-baseline-audit.contract.test.ts` for vitest discoverability; same contract as the strategy's `frontend/e2e/scripts/` path — see [Red Notes](#red-notes-phase-1) below.)*
- [~] Task: Classify each failure as seeding error, mock drift, race condition, stale selector, or genuine regression. *(MID Red: classification taxonomy encoded in the contract test's enum assertion; per-failure classification is the Green audit step that populates `baseline.json`.)*
- [~] Task: Update `measure/tech-debt.md` to remove TD-250 once root causes are classified into specific owned items. *(MID Red: TD-250 still on the open list; removal deferred to Green after the audit produces the classified items per test-strategy §4 "TD-250 swap".)*

### Red Notes (Phase 1)

**Targeted Red command (MID, bounded to one test file):**
```
bun --cwd frontend test --run src/__tests__/e2e-baseline-audit.contract.test.ts
```

**Red command actually executed at MID (PATH-restored local node):**
```
./node_modules/.bin/vitest run --config vitest.config.ts src/__tests__/e2e-baseline-audit.contract.test.ts
```

**Red result at HEAD (2026-06-19):** 15/15 tests fail. First failure: `existsSync` returns false on `baseline.json`. Subsequent 14 failures: `readFileSync` throws `ENOENT: no such file or directory, open '/home/daniel-bo/Desktop/fleet-commander/measure/tracks/e2e_test_baseline_hardening_20260619/baseline.json'`. Test count: 1 file, 15 tests, 15 failed, 0 passed, duration 7.66s. This is a "missing artifact" failure (the `baseline.json` capture step is not yet present), not a "stale durable record" failure — the test fails because the implementation is missing, satisfying the Red-phase invariant.

**Path deviation from test-strategy §5/§6:** The strategy specifies the contract test at `frontend/e2e/scripts/e2e-baseline-audit.test.ts`. The MID Red places the test at `frontend/src/__tests__/e2e-baseline-audit.contract.test.ts` because:
1. `frontend/vitest.config.ts` includes `src/**/*.test.{ts,tsx}` and not `e2e/scripts/**`. Placing the test under `src/__tests__/` requires no vitest config change (which would touch non-test infrastructure).
2. The existing pattern for artifact-contract tests is `frontend/src/__tests__/<name>.contract.test.ts` (e.g., `smoke-config.contract.test.ts` for `route_fixes_regression_20260613`).
3. The contract is identical regardless of path: the test reads `measure/tracks/e2e_test_baseline_hardening_20260619/baseline.json` and asserts its shape.

**Live behavior pairing (per test-strategy §6):** Phase 1's "live proof" is the `npx playwright test --reporter=json` invocation that produces `baseline.json`. This is Green-owned: the Green Implement role runs the full playwright suite (Phase 1 task 1) and populates the artifact with classified failures. The MID Red contract test then transitions from Red to Green when the artifact is created with the spec-pinned schema.

**Schema contract (enforced by the test, encoded for the Green audit):**
- Top-level keys: `captured_at` (ISO 8601 string), `summary` (object), `failures` (array).
- `summary.byClassification` must include all five classification keys with non-negative integer counts: `adapter-mock-drift`, `selector-drift`, `race`, `stale-selector`, `genuine-regression`.
- `summary.failed` must equal the sum of `byClassification` values.
- `summary.total` and `summary.passed` must be non-negative integers.
- Each `failures[i]` must have: `id` (non-empty string, unique), `file` (non-empty string matching a known spec filename), `title` (non-empty string), `classification` (one of the five valid values), `td_pointer` (non-empty string matching `^TD-\d+[a-z]*$`).
- All `file` values must come from the 27 known spec files under `frontend/e2e/*.spec.ts`.

**Classification taxonomy (per test-strategy §4):**
- `adapter-mock-drift` → Phase 2 (seed factory)
- `selector-drift`, `stale-selector`, `race` → Phase 3 (spec stabilization)
- `genuine-regression` → independent investigation, not addressed by this track

### Red-Phase Boundary Fix (supervisor gate remediation, 2026-06-19)

**Issue:** Supervisor gate flagged `graph.db` as a non-test/non-Measure file change that violated the Red-phase boundary.

**Root cause:** `graph.db` arrived in the MID-start worktree as pre-existing dirty state (`M graph.db`, 6406144 → 6410240 bytes, exactly one SQLite page). The MID Red session ran only read-only `build-graph` queries (`stats`, `search`, `files`, `audit`) — none of which should write to the database. The `build-graph audit` command timed out at 120s mid-execution, which is the most likely contributor to any write-side activity. Regardless of root cause, the supervisor's gate is correct: a non-test/non-Measure file in the worktree at Red closeout is a boundary violation.

**Fix applied (this attempt):** `git checkout HEAD -- graph.db` restored the file to the committed state. Post-fix worktree contains no `graph.db` modifications from this track. The previous attempt's commit `8d9fc29` is preserved unchanged (it never included `graph.db` — staging was scoped to track files only).

**Pre-emptive guard for the Green/closeout role:** `build-graph update ./graph.db` is explicitly Green/closeout-owned per test-strategy §2 ("Red-phase commits touch tests + Measure docs only. Defer `build-graph update` to Green/closeout"). Do NOT run `build-graph update` in any Red phase. The Green Implement role runs `build-graph update ./graph.db <changed-files>` as a final closeout step (Phase 4 task 6).

## Phase 2: Deterministic Seed And Fixture Factory

- [ ] Task: Design a shared E2E seed fixture schema (projects, sprints, tasks, agents, settings) in `e2e/helpers/seed.ts`.
- [ ] Task: Write Red-phase tests for the seed factory asserting idempotency, isolation, and required entities.
- [ ] Task: Implement the seed factory using the typed Convex client and a dedicated `e2e_test` namespace or cleanup hook.
- [ ] Task: Replace ad-hoc seeding in `dashboard.spec.ts`, `kanban.spec.ts`, and `project.spec.ts` with the factory.
- [ ] Task: Add a contract test that verifies every E2E spec imports and uses the factory.

## Phase 3: Stabilize Critical-Path Specs

- [ ] Task: Fix the critical-path smoke spec (`smoke.spec.ts`) using the factory; add a Red test first that fails without the fix.
- [ ] Task: Stabilize `dashboard.spec.ts` by waiting on Convex subscription readiness instead of arbitrary timeouts.
- [ ] Task: Stabilize `kanban.spec.ts` with deterministic card data and role-aware selectors.
- [ ] Task: Stabilize `project.spec.ts` by seeding a known project state before each test.
- [ ] Task: For any spec that cannot be made deterministic in this track, add a `@quarantine` tag and a linked follow-up task in `measure/tech-debt.md`.
- [ ] Task: Run the full E2E suite and confirm zero unexpected failures.

## Phase 4: Wire Into Quality Gate

- [ ] Task: Add `npx playwright test` to `measure/doctor.sh` or the quality workflow verify step.
- [ ] Task: Write a test that proves the verify command includes the E2E baseline when the quality profile is not `none`.
- [ ] Task: Update `measure/tech-stack.md` with the canonical E2E command and environment setup.
- [ ] Task: Update `measure/lessons-learned.md` with the seed-factory pattern and anti-patterns to avoid.
- [ ] Task: Run `bun --cwd pivot test`, `bun --cwd frontend test --run`, and `bun --cwd frontend check`.
- [ ] Task: Run `build-graph update ./graph.db` for changed TypeScript and config files.
- [ ] Task: Mark this track complete only after the full E2E baseline is green on a clean checkout.
