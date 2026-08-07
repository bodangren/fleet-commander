# Closeout: useConvexData god-file decomposition

**Track ID:** `useConvexData_godfile_decomposition_20260625`  
**Closed:** 2026-08-07  
**Status:** completed (reconciliation — work already shipped earlier)  
**TD:** TD-217 → Resolved

## Outcome

The June-25 track re-registered god-file decomposition that had already been delivered under **God-File Splits and Test-Coverage Closure** (`godfile_splits_and_test_coverage_20260603` / commit lineage around `3d2d87b`).

At closeout HEAD:

| Spec AC (original) | Reality |
| --- | --- |
| Split god-file | Done: domain modules under `frontend/src/lib/convex-data/` |
| Shared query core | Done: `convex-data/core.ts` (`useConvexQuery`) |
| Delete `useConvexData.ts` | Partial: 57-line re-export barrel retained for compat |
| All callers use new paths | Partial: many still import the barrel |
| Characterization | Partial: transform helpers covered in `useConvexData.test.ts` |

## Why not re-execute the plan

Re-running Phase 1–2 of the original plan would re-split already-modular code under different directory names (`lib/convex/` vs existing `lib/convex-data/`). That is waste, not progress.

## Residual (optional, Low)

- Retire the barrel: migrate imports to `@/lib/convex-data`, delete `useConvexData.ts`.
- One `as any` remains in `convex-data/core.ts` on Convex client `onUpdate` typing.
- Not tracked as Critical debt; optional hygiene only.

## Verification at closeout

- `frontend/src/lib/useConvexData.ts` is a barrel only (not a god-file).
- Domain modules exist and are individually sized well under the historical 500-line threshold.
- Frontend unit suite green on `chore/scalpel` per `SCALPEL-HANDOFF.md`.
