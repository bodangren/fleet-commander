# Plan: E2E Test Baseline Hardening

## Phase 1: Audit Baseline Failures

- [ ] Task: Run `npx playwright test` and capture the full failure report with categories.
- [ ] Task: Add a `scripts/e2e-baseline-audit.test.ts` contract test that asserts the audit report shape and known-failure IDs.
- [ ] Task: Classify each failure as seeding error, mock drift, race condition, stale selector, or genuine regression.
- [ ] Task: Update `measure/tech-debt.md` to remove TD-250 once root causes are classified into specific owned items.

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
