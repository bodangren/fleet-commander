# Plan: Status & Enum Source-of-Truth Unification

## Phase 1: Inventory & Contract
- [ ] Task: Grep `convex/schema/**` and `convex/lib/validators.ts` for every `v.union(v.literal(...))`; build a table of vocabulary → definition site(s) → consumers (pivot, frontend display maps).
- [ ] Task: Flag every vocabulary defined inline in more than one place, or in schema instead of validators.
- [ ] Task: For each, decide the canonical home in `validators.ts` and the derived TS type / display-map export. Record as the contract before editing.

## Phase 2: Consolidate Validators
- [ ] Task: Move/define each status vocabulary as one exported validator in `validators.ts`; export a derived TS union type alongside.
- [ ] Task: Replace duplicate inline unions in schema/handlers with imports of the canonical validator.
- [ ] Task: Where a UI renders a status, extract a single `{value: {label,color}}` map co-located with the type; update components to import it (removes drift between color/label maps).
- [ ] Task: Tests: a small unit test per vocabulary asserting validator values === display-map keys (catches future drift).

## Phase 3: Resolve providers.status Overload (TD-235)
- [ ] Task: Add `providerHealthStatus` validator + `healthStatus` field to the providers table (operational `status` stays as-is).
- [ ] Task: Repoint `updateProviderHealth` to write `healthStatus`; update `getProviderHealth` return shape and ProviderCard/ProvidersPage reads.
- [ ] Task: Convex migration: backfill `healthStatus` for existing provider rows.
- [ ] Task: Verify `convex/providers.ts:199,213` typecheck clean; mark TD-235 resolved.

## Phase 4: Guard & Verify
- [ ] Task: Add a doctor check (or extend Check 4 family) that flags new inline status `v.union(v.literal(...))` in `convex/schema/**` not sourced from `validators.ts`; allowlist current exceptions; negative-test it.
- [ ] Task: Run all suites + `bun --cwd pivot typecheck` + `doctor.sh all`; full green.
- [ ] Task: Update `build-graph`; add a `schema_status_drift` reinforcement note to lessons-learned if warranted.
- [ ] Task: Commit and push.
