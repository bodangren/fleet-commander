# Implementation Plan: Fix Hardcoded Harness Name

## Phase 1: Schema & Interface Update

- [ ] Task: Add `harnessName` to runContracts schema
    - [ ] Add `v.optional(v.string())` field to `convex/schema.ts` runContracts table
    - [ ] Add `harnessName: v.optional(v.string())` to `convex/runContracts.ts` runContractEntry validator
    - [ ] Run `npx convex dev` to regenerate types

- [ ] Task: Update RunContractRecord interface
    - [ ] Add `harnessName?: string` to `RunContractRecord` in `pivot/src/policy/rollup.ts`

## Phase 2: Fix Rollup Functions

- [ ] Task: Fix groupByHarness
    - [ ] Replace hardcoded `'opencode'` with `record.harnessName ?? 'opencode'`
    - [ ] Update tests in `rollup.test.ts` to verify multi-harness grouping

- [ ] Task: Fix identifyDirtyBuckets
    - [ ] Replace hardcoded `'opencode'` with `record.harnessName ?? 'opencode'`
    - [ ] Update tests in `rollup.test.ts` to verify dirty bucket tracking

## Phase 3: Verification

- [ ] Task: Run full test suite
    - [ ] Run `npm run test` to verify all tests pass
    - [ ] Run `npm run build` to verify build succeeds

- [ ] Task: Update tech-debt.md
    - [ ] Mark TD-027 as resolved
