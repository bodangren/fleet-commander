# Specification: Fix Hardcoded Harness Name in Rollup

## Overview

TD-027: The `groupByHarness` and `identifyDirtyBuckets` functions in `pivot/src/policy/rollup.ts` hardcode the harness name to `'opencode'`. This prevents multi-harness support and produces incorrect stats when multiple harnesses are used.

## Functional Requirements

1. Add optional `harnessName` field to the `runContracts` Convex schema
2. Update `RunContractRecord` interface in `rollup.ts` to include `harnessName`
3. `groupByHarness` must derive harness name from the record's `harnessName` field, falling back to `'opencode'` for backward compatibility
4. `identifyDirtyBuckets` must derive harness name from the record's `harnessName` field, falling back to `'opencode'` for backward compatibility
5. All existing tests must pass
6. New tests must cover multi-harness grouping

## Acceptance Criteria

- [ ] Schema migration adds `harnessName` as optional field
- [ ] `groupByHarness` groups records by their actual harness name
- [ ] `identifyDirtyBuckets` tracks dirty harnesses by actual name
- [ ] Backward compatibility: records without `harnessName` default to `'opencode'`
- [ ] All tests pass
- [ ] Build succeeds

## Out of Scope

- Updating callers to populate `harnessName` (separate track)
- Harness profile management UI changes
