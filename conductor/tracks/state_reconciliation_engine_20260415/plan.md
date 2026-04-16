# Implementation Plan — State Reconciliation Engine (C1)

## Phase 1: Rules + Schema

- [x] Task: Write failing tests for `reconciliation.yml` parser + validator
- [x] Task: Create `conductor/reconciliation.yml` with rules for task, trackMetadata, issue, plan
- [x] Task: Implement parser + Zod schema
- [x] Task: Tests pass

## Phase 2: Proposal + Decision Storage

- [ ] Task: Write failing tests for `reconciliationProposals` + `reconciliationDecisions` mutations/queries
- [ ] Task: Add tables to `convex/schema.ts`
- [ ] Task: Implement CRUD
- [ ] Task: Regenerate Convex API types
- [ ] Task: Tests pass

## Phase 3: Engine (TDD)

- [ ] Task: Write failing tests for `proposePatches(events, rules)` across each artifact class
- [ ] Task: Implement proposal generation in `pivot/src/reconciliation/engine.ts`
- [ ] Task: Write failing tests for auto-apply paths (`prefer_canonical`, `prefer_export`)
- [ ] Task: Implement auto-apply with atomic transaction
- [ ] Task: Write failing tests for rejection dedup (rejected hash not re-proposed)
- [ ] Task: Implement dedup
- [ ] Task: Tests pass

## Phase 4: Reconcile UI

- [ ] Task: Write failing tests for `<ReconcilePanel />` (list, diff view, apply, reject)
- [ ] Task: Implement `frontend/src/pages/Reconcile.tsx` under `/ops/reconcile`
- [ ] Task: Wire into B4 Ops Console nav
- [ ] Task: Tests pass

## Phase 5: Startup Integrity Check

- [ ] Task: Write failing test for startup sweep that proposes missing-canonical artifacts
- [ ] Task: Implement integrity check
- [ ] Task: Tests pass

## Phase 6: Verification

- [ ] Task: `npm run test` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Commit + plan update
