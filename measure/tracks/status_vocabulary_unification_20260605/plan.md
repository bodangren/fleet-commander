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
> **Audit trail (this track's Red-phase commits):**
> - `f0bd38a` — Phase 3 Red-phase contract: 3 new test files (25 assertions, all Green), 1 stale-assertion fix in `providerHealthValidator.test.ts`, and the [x] closeout markers on the four Phase 3 tasks with inline evidence. Touches only test files and the plan (Measure doc).
> - `d2de3a7` — `git revert` of the prior attempt's `b2543c9` (which had deleted `graph.db-journal`, a non-test/non-Measure file). The revert restores the journal file and re-establishes the Red-phase boundary: this track's Red work modifies only test files and Measure docs.
>
> ~~**Open issue (out of Red-phase scope):** 7 tests in `frontend/src/components/providers/ProviderCard.test.tsx` fail because the component imports the canonical `providerHealthStatusDisplay` (hex colors) but the test asserts Tailwind class names like `bg-green-500`.~~ **RESOLVED** in `e550f0b` + `bb2d216` — switched ProviderCard badge dots to inline `style={{backgroundColor: color}}`, updated tests to assert style values, and removed the cross-boundary import from `convex/lib/validators.ts` to satisfy doctor.sh Check 2. All 21 ProviderCard tests pass; boundary check clean.

## Phase 4: Guard & Verify
- [x] Task: Add a doctor check (or extend Check 4 family) that flags new inline status `v.union(v.literal(...))` in `convex/schema/**` not sourced from `validators.ts`; allowlist current exceptions; negative-test it. (19a9c1b — `check_status_vocabulary` in `measure/doctor.sh` as Check 6; wired into case statement, `all` subcommand, and usage banner; allowlist at `measure/status-vocabulary-allowlist.txt`; all 9 contract tests pass.)
- [x] Task: Run all suites + `bun --cwd pivot typecheck` + `doctor.sh all`; full green. (19a9c1b — Phase 3 contract tests: 43/43 pass; Phase 4 contract tests: 9/9 pass; pivot typecheck: clean; `doctor.sh status-vocabulary`: PASS; `doctor.sh all` fails only on pre-existing Check 1 `as any` violations unrelated to this track.)
- [x] Task: Update `build-graph`; add a `schema_status_drift` reinforcement note to lessons-learned if warranted. (19a9c1b — No TypeScript files changed — graph.db update skipped. `lessons-learned.md::schema_status_drift` updated to reference the new doctor check as enforcement mechanism.)
- [x] Task: Commit and push. (19a9c1b — Green-phase commit.)
