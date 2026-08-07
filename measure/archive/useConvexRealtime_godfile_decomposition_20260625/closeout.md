# Closeout: useConvexRealtime god-file decomposition

**Track ID:** `useConvexRealtime_godfile_decomposition_20260625`  
**Closed:** 2026-08-07  
**Status:** completed (reconciliation — work already shipped earlier)  
**TD:** TD-218 → Resolved

## Outcome

Decomposition shipped earlier (same god-file-splits wave). At closeout HEAD:

| Spec AC (original) | Reality |
| --- | --- |
| Split god-file | Done: `frontend/src/lib/convex-realtime/*` |
| Shared subscription core | Done: `convex-realtime/core.ts` reuses `useConvexQuery` |
| Zero `as any` in realtime modules | Done (no casts in convex-realtime/) |
| Delete barrel | Partial: 52-line re-export barrel remains |
| Callers on new paths | Partial: many still import `@/lib/useConvexRealtime` |

## Residual (optional, Low)

Same import-hygiene chore as TD-217: migrate to `@/lib/convex-realtime` and delete the barrel.

## Verification at closeout

- Largest domain file in `convex-realtime/` is well under 120 lines.
- Core is 52 lines.
