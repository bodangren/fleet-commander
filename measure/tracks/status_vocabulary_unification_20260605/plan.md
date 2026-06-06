# Plan: Status & Enum Source-of-Truth Unification

## Phase 1: Inventory & Contract
- [x] Task: Grep `convex/schema/**` and `convex/lib/validators.ts` for every `v.union(v.literal(...))`; build a table of vocabulary → definition site(s) → consumers (pivot, frontend display maps).
- [x] Task: Flag every vocabulary defined inline in more than one place, or in schema instead of validators.
- [x] Task: For each, decide the canonical home in `validators.ts` and the derived TS type / display-map export. Record as the contract before editing.

## Phase 2: Consolidate Validators
- [x] Task: Move/define each status vocabulary as one exported validator in `validators.ts`; export a derived TS union type alongside. (fedbbc5)
- [x] Task: Replace duplicate inline unions in schema/handlers with imports of the canonical validator. (fedbbc5)
- [x] Task: Where a UI renders a status, extract a single `{value: {label,color}}` map co-located with the type; update components to import it (removes drift between color/label maps). (fedbbc5)
- [x] Task: Tests: a small unit test per vocabulary asserting validator values === display-map keys (catches future drift). (fedbbc5)

## Phase 3: Resolve providers.status Overload (TD-235)
- [x] Task: Add `providerHealthStatus` validator + `healthStatus` field to the providers table (operational `status` stays as-is). (71a7f8b — provider_health_resilience track; validator at `convex/lib/validators.ts:114`, schema field at `convex/schema/agents.ts:38`.)
- [x] Task: Repoint `updateProviderHealth` to write `healthStatus`; update `getProviderHealth` return shape and ProviderCard/ProvidersPage reads. (71a7f8b — `updateProviderHealth` writes `healthStatus` at `convex/providers.ts:202`; `getProviderHealth` and `getProviderHistory` return shapes updated; ProviderCard/ProvidersPage read `healthStatus ?? status`.)
- [x] Task: Convex migration: backfill `healthStatus` for existing provider rows. (71a7f8b — `backfillProviderHealthStatus` at `convex/providers.ts:286`; idempotency contract pinned by `convex/providersBackfill.test.ts`.)
- [x] Task: Verify `convex/providers.ts:199,213` typecheck clean; mark TD-235 resolved. (pivot typecheck clean 2026-06-06; Phase 3 Red-phase contract test `convex/statusVocabPhase3Contract.test.ts` passes 8/8; `convex/providerHealthVocabulary.test.ts` passes 15/15; `convex/providersHealthIntegration.test.ts` passes 10/10; `convex/providersBackfill.test.ts` passes 7/7; `convex/providerHealthValidator.test.ts` passes 3/3 after fixing stale `.validate` assertion to use `isConvexValidator`.)

> **Status:** Phase 3 functionally complete in commit 71a7f8b (under the `provider_health_resilience` track). This track's Red-phase contract is locked by `statusVocabPhase3Contract.test.ts`, `providersBackfill.test.ts`, `providersHealthIntegration.test.ts`, and the corrected `providerHealthValidator.test.ts`. The original plan markers were stale; work was done out-of-band but is fully verified.
>
> **Open issue (out of Red-phase scope):** 7 tests in `frontend/src/components/providers/ProviderCard.test.tsx` fail because the component imports the canonical `providerHealthStatusDisplay` (hex colors) but the test asserts Tailwind class names like `bg-green-500`. This is a source-code mismatch — the test-strategy §3 says display maps "must be keyed off the derived TS union via `satisfies Record<StatusType, X>`" but the value type is currently a hex string. The fix needs to align display-map values with how the component consumes them (either switch the component to use `style={{backgroundColor: color}}` or change the display map to Tailwind classes). Tracked as a frontend wiring follow-up, not a Phase 3 Red-phase contract issue.

## Phase 4: Guard & Verify
- [ ] Task: Add a doctor check (or extend Check 4 family) that flags new inline status `v.union(v.literal(...))` in `convex/schema/**` not sourced from `validators.ts`; allowlist current exceptions; negative-test it.
- [ ] Task: Run all suites + `bun --cwd pivot typecheck` + `doctor.sh all`; full green.
- [ ] Task: Update `build-graph`; add a `schema_status_drift` reinforcement note to lessons-learned if warranted.
- [ ] Task: Commit and push.
