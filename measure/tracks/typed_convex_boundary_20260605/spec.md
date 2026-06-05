# Spec: Typed Convex API Boundary

## Problem

`doctor.sh`'s as-any guard reports **191 `as any` usages** in production code,
and the as-any-allowlist's broadest exemptions exist specifically to wave
through Convex calls: `pivot/src/routes/**/*.query(`, `.mutation(`, and "Convex
ID type coercion". The root cause is that pivot routes and some frontend code
call Convex via the **string-based API** (`client.query('module:fn', args)`)
and then cast args/results with `as any`, bypassing the generated types in
`convex/_generated/api`. This is the `as_any_mask` lesson at scale: every cast
hides a potential contract mismatch between the route and the Convex function it
calls (the kind of mismatch that produced TD-200 and the `fallbackEvents` gap).

The project already consolidated on `convexClient.ts` with typed
`typedQuery`/`typedMutation` helpers (TD-204 resolved), but they are not used
everywhere, and the string-based escape hatch remains common.

## Solution

Make the typed `convex/_generated/api` references the only sanctioned way to
call Convex from pivot and frontend. Provide thin typed wrappers where the raw
client is awkward, migrate string-based call sites onto them, and delete the
matching `as any` casts. Then tighten the as-any allowlist so the Convex
escape-hatch globs no longer apply.

## Acceptance Criteria

- [ ] Inventory of every `client.query('...')` / `client.mutation('...')`
      string-based call and every Convex-related `as any` in pivot + frontend.
- [ ] A typed call path exists for each (via `typedQuery`/`typedMutation` +
      `api.*` refs, or a thin generic wrapper) with no `as any` at the call site.
- [ ] String-based Convex calls migrated to the typed path; corresponding
      `as any` casts removed.
- [ ] The `pivot/src/routes/**/*.query(` and `.mutation(` and "Convex ID type
      coercion" globs are **removed** from `as-any-allowlist.txt` (or narrowed to
      a small, named residue) without the as-any check regressing.
- [ ] Depends on / coordinates with TD-236: the as-any guard must actually read
      the allowlist before this track's removals are meaningful.
- [ ] All suites + typecheck green; `build-graph` updated.

## Out of Scope

- Non-Convex `as any` casts (e.g. harness profile loaders) — leave allowlisted.
- Changing Convex function signatures (that surfaces as separate bugs to fix).
- Frontend↔pivot HTTP boundary typing (the API-route DTOs) — separate concern.

## Cross-References

- Hard dependency: TD-236 (as-any guard must read its allowlist) — owned by
  review_remediation; this track removes entries once the guard works.
- Lessons: `as_any_mask`, `api_shape`.
