# Track: Fix Coverage Query Performance (TD-015)

## Problem

`convex/coverageRecords.ts` queries use `.filter()` + `.collect()`, which violates Convex hot-path rules:
- `getCoverageHistory`: Collects ALL records, filters in JS, then slices
- `getLatestCoverage`: Uses `.filter().collect()` then sorts in JS

The schema already has `by_project_and_date` index but queries don't use it.

## Solution

Replace `.filter().collect()` with `.withIndex('by_project_and_date').order('desc').take(limit)` / `.first()`.

## Acceptance Criteria

1. `getCoverageHistory` uses `withIndex('by_project_and_date').order('desc').take(limit)`
2. `getLatestCoverage` uses `withIndex('by_project_and_date').order('desc').first()`
3. `coverageRecords` module appears in `_generated/api.d.ts` (regenerated)
4. Existing tests pass (if any exist)
5. Typecheck and lint pass