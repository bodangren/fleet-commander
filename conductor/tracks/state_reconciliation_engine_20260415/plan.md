# Implementation Plan — State Reconciliation Engine (C1)

## Phase 1: Rules + Schema

- [x] Task: Write failing tests for `reconciliation.yml` parser + validator
- [x] Task: Create `conductor/reconciliation.yml` with rules for task, trackMetadata, issue, plan
- [x] Task: Implement parser + Zod schema
- [x] Task: Tests pass

## Phase 2: Proposal + Decision Storage

- [x] Task: Write failing tests for `reconciliationProposals` + `reconciliationDecisions` mutations/queries
- [x] Task: Add tables to `convex/schema.ts`
- [x] Task: Implement CRUD
- [x] Task: Regenerate Convex API types (manual update to `api.d.ts`)
- [x] Task: Tests pass

## Phase 3: Engine (TDD)

- [x] Task: Write failing tests for `proposePatches(events, rules)` across each artifact class
- [x] Task: Implement proposal generation in `pivot/src/reconciliation/engine.ts`
- [x] Task: Write failing tests for auto-apply paths (`prefer_canonical`, `prefer_export`)
- [x] Task: Implement auto-apply with atomic transaction (`batchApplyProposals` Convex mutation)
- [x] Task: Write failing tests for rejection dedup (rejected hash not re-proposed)
- [x] Task: Implement dedup
- [x] Task: Tests pass

## Phase 4: Reconcile UI

- [x] Task: Write failing tests for `<ReconcilePanel />` (list, diff view, apply, reject)
- [x] Task: Implement `frontend/src/pages/Reconcile.tsx` under `/ops/reconcile`
- [x] Task: Wire into B4 Ops Console nav (added as fifth tab)
- [x] Task: Tests pass

## Phase 5: Startup Integrity Check

- [x] Task: Write failing test for startup sweep that proposes missing-canonical artifacts
- [x] Task: Implement integrity check (`runIntegrityCheck` in `pivot/src/reconciliation/integrity.ts`)
- [x] Task: Tests pass

## Phase 6: Verification

- [x] Task: `npm run test` all pass (pivot 570 + frontend 141)
- [x] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Commit + plan update
