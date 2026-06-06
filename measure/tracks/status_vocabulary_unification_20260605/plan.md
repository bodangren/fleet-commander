# Plan: Status & Enum Source-of-Truth Unification

## Phase 1: Inventory & Contract
- [x] Task: Grep `convex/schema/**` and `convex/lib/validators.ts` for every `v.union(v.literal(...))`; build a table of vocabulary → definition site(s) → consumers (pivot, frontend display maps).
- [x] Task: Flag every vocabulary defined inline in more than one place, or in schema instead of validators.
- [x] Task: For each, decide the canonical home in `validators.ts` and the derived TS type / display-map export. Record as the contract before editing.

## Phase 2: Consolidate Validators
- [~] Task: Move/define each status vocabulary as one exported validator in `validators.ts`; export a derived TS union type alongside. (Red-phase contract in `convex/lib/validators.test.ts` — 32/51 vocabularies fail the export test; new Red-phase tests for derived TS type added in this commit.)
- [~] Task: Replace duplicate inline unions in schema/handlers with imports of the canonical validator. (Red-phase contract in `convex/lib/validators.test.ts` — all `definedAt` sites assert the import now exists; Red until Phase 2 Green.)
- [~] Task: Where a UI renders a status, extract a single `{value: {label,color}}` map co-located with the type; update components to import it (removes drift between color/label maps). (Red-phase contract in `convex/lib/validators.test.ts` — 6 vocabularies with `displayMap` field assert canonical display map is exported from `convex/lib/validators.ts`; Red until Phase 2 Green.)
- [~] Task: Tests: a small unit test per vocabulary asserting validator values === display-map keys (catches future drift). (Red-phase assertions in `convex/lib/validators.test.ts` — display-map key parity test added in this commit; Red until Phase 2 Green.)

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
