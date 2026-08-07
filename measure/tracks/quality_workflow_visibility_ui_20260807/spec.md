# Spec: Quality workflow visibility UI

## Goal

Ship the human-facing configure → observe → diagnose surface for quality-workflow profiles. Production AutoRunner already runs quality stages via `createProductionQualityWorkflowHooks()`; this track is **UI + E2E**, not runner injection.

## Why

`frontend/e2e/quality-workflow.spec.ts` is intentionally written against routes/components that were not fully productized (`/settings/quality`, QualityStageRow, QualityOperationsPanel). Closing TD-252 without this track left a product hole.

## Acceptance Criteria

1. Settings exposes quality profile selection (`none` / `standard` / `strict`) with ordered stage list for the selected profile.
2. Task timeline shows quality stage rows when a run has quality results (attempts, cost/evidence when available).
3. Ops/Diagnose surfaces blocked quality gates with retry or clear next action and audit feedback.
4. `frontend/e2e/quality-workflow.spec.ts` (`@quality-workflow`) passes against the mock/seed harness.
5. Focused Vitest coverage for new components/hooks.
6. No change required to production AutoRunner wiring unless a real gap is proven (regression tests already cover injection).

## Non-Goals

- Re-implementing `QualityWorkflowRunner`.
- Changing stage semantics (strategy/Red/Green/etc.).
- Full Playwright suite green-up (TD-260).

## Verification

- `bun run --cwd frontend test`
- Targeted Playwright: quality-workflow tagged spec
- Manual smoke on settings + timeline + ops with a demo seed
