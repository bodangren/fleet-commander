# Spec: E2E Test Baseline Hardening

## Goal

Make the existing Playwright E2E suite a reliable, deterministic quality gate by fixing the mock and data-seeding drift that currently keeps the baseline red.

## User Impact

Engineering managers and developers can trust E2E results before approving agent-merged work. The autonomous pipeline gains a real end-to-end safety net that catches UI regressions, broken navigation, and data-flow mismatches.

## Acceptance Criteria

1. `npx playwright test` runs to completion with zero unexpected failures on a clean worktree.
2. Every E2E spec that exercises a canonical user flow has a deterministic Convex seed fixture and isolated test data.
3. Mock/data-seeding anti-patterns identified in TD-250 are removed or replaced with a shared factory.
4. The E2E baseline command is documented in `measure/tech-stack.md` and invoked by `measure/doctor.sh` or the quality workflow.
5. Flaky tests are either fixed or quarantined with a linked follow-up track; no flaky tests remain in the baseline.
6. At least one smoke spec proves the critical path: dashboard loads, a project exists, and the kanban board renders cards.
7. CI or the local `verify` gate fails if the E2E baseline regresses.

## Non-Goals

- Adding large amounts of new E2E coverage; this track hardens what already exists.
- Rewriting the frontend component layer or the Convex schema.
- Replacing Playwright with another E2E tool.

## Verification

- `npx playwright test --reporter=list` passes locally against a seeded dev environment.
- `bun --cwd pivot test` and `bun --cwd frontend test --run` still pass after seed/factory changes.
- `bun --cwd frontend check` (lint + typecheck) is clean.
- `build-graph update ./graph.db <changed files>` succeeds.
