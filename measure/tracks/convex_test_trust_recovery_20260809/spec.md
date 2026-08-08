# Spec: Convex test trust recovery

## Overview

TD-263 is the test-trust recovery track for the Convex suite, which mixed registered Convex functions with direct handler calls and hand-built contexts. The implementation lanes repaired the exposed production contracts and moved the selected critical unsupported tests onto the `convex-test` JavaScript mock runtime with explicit identities. The current dirty-worktree full gates pass; the track remains **in progress** only because clean-checkout acceptance has not been performed.

The authoritative track baseline is **1,299 passed / 139 failed / 629 warnings**, captured for the 2026-08-09 recovery audit. The earlier scalpel closeout snapshot (**1,241 passed / 157 failed**) remains historical evidence at `measure/tracks/scalpel_branch_closeout_20260807/evidence/BASELINE.md`; it is not the baseline for this track. Current dirty-worktree closeout evidence is **21 runtime files / 105 tests passed**, **35 remaining Bun files / 957 tests passed / 0 failed**, frontend **173 files / 1,260 tests passed in 276.93s**, Pivot **1,725 / 1,725 passed**, and passing Convex/Pivot typechecks. Frontend check/lint/build pass; the build produced 2,803 modules with an existing >500k advisory. The 23 notification-only wrapper warnings and frontend's 59 legacy React `act` warnings plus one duplicate-key warning are explicitly classified as separate follow-up debt, not TD-263 failures. Employees/runs/scheduler/unused UI and hook cleanup remains deferred to TD-247. Real Chrome aggregate evidence is **3 passed / 1 approval-gated skipped in 1.2m**.

The graph probe found the main boundaries in `convex/lib/auth.ts`, `convex/__fixtures__/auth.ts`, `convex/history/tasks.ts`, `convex/schema/tasks.ts`, `convex/lib/analytics.ts`, `convex/analytics.ts`, and `convex/auth.config.ts`. Graph caller results are incomplete for several Convex handler symbols, so file-level contracts and real runtime tests are the source of truth.

`convex-test` is an in-process JavaScript mock runtime. It exercises schema, registration, validators, identity handling, and function behavior without connecting to a deployed or local Convex backend. It is necessary runtime-level evidence for the unit suite, but it is not the real backend proof; the no-mock Chrome journey remains the backend/network acceptance for history and filters.

## Functional Requirements

### FR-1: Explicit identity is required by test contexts

- Direct-wrapper tests that remain temporarily necessary must use one shared authenticated fixture with a stable `tokenIdentifier`; an anonymous `getUserIdentity` may not make protected behavior pass.
- Critical behavior tests must use `convex-test` with the schema/module map and `withIdentity` (or the repository's equivalent helper) before invoking registered public functions in the JavaScript mock runtime.
- Production authentication semantics remain fail-closed. This track does not weaken `resolveActor` or add an anonymous production fallback.

### FR-2: Stale validators and dead types are removed

- Delete validator/type exports whose production owner was removed, including stale pipeline vocabulary left after the deleted pipeline surface.
- Canonical shared validators remain the only source for task and analytics status vocabularies; tests must not preserve deleted production contracts merely to make old assertions pass.
- No OpenCode, YAML pipeline, A/B/simulation, employees, or runs production surface may be revived as a test compatibility layer. The employees/runs/scheduler/unused UI-or-hook orphan surface is left untouched by TD-263; its safe removal requires a separate architectural/dead-code/schema migration decision.

### FR-3: History filtering is correct and bounded

- `listTaskHistoryHandler` applies project/status filtering through the appropriate composite index before the result limit and keeps search over-fetch bounded.
- Agent enrichment reads only the IDs returned for the page rather than collecting the entire agents table.
- Performance tests prove status-only, search-only, combined, pagination, and agent-enrichment behavior on a representative data set without an unbounded query.

### FR-4: Analytics uses canonical vocabulary and has runtime coverage

- Analytics helpers consume the shared task status vocabulary and map current task states deliberately; stale `todo`/`failed` assumptions must not silently define production behavior.
- At least one runtime smoke test calls the registered analytics path through the `convex-test` JavaScript mock runtime with an authenticated identity and verifies metric-helper output from schema-shaped data.
- Pure helper tests remain useful, but they are supplementary and cannot be the only evidence for the Convex query path.

### FR-5: Auth config is typed without hiding environment drift

- `convex/auth.config.ts` type-checks in the Convex compilation context while reading deployment environment variables without an unsafe global declaration or test-only bypass that changes production behavior.
- Auth fixture environment restoration is deterministic and does not leak between tests.

### FR-6: The inconsistent employees legacy suite is removed from acceptance

- The caller/source audit found no router/render caller for `EmployeesPage`, no consumer of the `useActiveEmployees` re-export, no Pivot caller, and only generated-API/test ownership for `convex/employees.ts`; `convex/scheduler.ts` is explicitly migration-only. The legacy test also encoded an inconsistent agents-vs-employees ID contract.
- Delete `convex/employees.test.ts` from TD-263 acceptance. Do not replace it with a `convex-test` runtime suite, revive a production API, or preserve the contradictory fake-context assertions.
- Removing the employees/runs tables, scheduler, unused UI/hook, and related schema/generated surface requires a separate future dead-code/schema migration track with caller, data-ownership, and compatibility evidence; that track is not opened here.

## Non-Functional Requirements

- The final TD-263 Convex gate runs the complete discovered suite with `VERIFY_REQUIRE_CONVEX=1` semantics and no quarantine escape. Current dirty-worktree runtime, Bun, Pivot, frontend, typecheck, check/lint/build evidence is green; separately classified notification/frontend warnings do not belong to TD-263 acceptance. The only remaining TD-263 gate is clean-checkout verification.
- TD-263-owned failures and test errors are **zero**. The remaining **23 notification-only wrapper warnings** are explicitly classified with source and owner (the next P0 notification authorization/security track), and are not silently suppressed or counted as TD-263 coverage. Unclassified TD-263 warnings are not acceptable.
- Convex functions retain strict argument/return validators, use schema indexes for bounded reads, and use `Id`/`Doc` types at database boundaries.
- No test or acceptance step mutates production data, dispatches a task, starts a sprint, changes continuous mode, or invokes the approval-gated Bounded Factory path. `convex-test` mutations remain in-process mock-runtime state, not backend writes.

## Acceptance Criteria

1. The baseline ledger records 1,299 passed, 139 failed, and 629 warnings, with the historical 1,241/157 snapshot distinguished from the authoritative current baseline.
2. Phase-A contract tests and implementation are green for explicit identity, stale validator/dead type cleanup, history filter/index/performance behavior, canonical analytics vocabulary, and typed `auth.config` access.
3. Every critical unsupported direct-wrapper suite selected by the inventory runs through the `convex-test` JavaScript mock runtime with `withIdentity`; no fake context is the sole evidence for protected behavior.
4. A `convex-test` JavaScript mock-runtime smoke test covers the analytics metric-helper path with schema data and an authenticated identity; the real backend proof remains the Chrome journey.
5. The unsupported, inconsistent legacy suite `convex/employees.test.ts` is removed from TD-263 acceptance without production changes or a replacement runtime suite; employees/runs, scheduler, unused UI/hook, and related schema cleanup are explicitly deferred to the separate TD-247 dead-code/schema migration.
6. Current dirty-worktree runtime, Bun, Pivot, frontend, typecheck, frontend check/lint/build gates are green: runtime 21 files / 105 passed, Bun 35 files / 957 passed / 0 failed, frontend 173 files / 1,260 passed in 276.93s, and Pivot 1,725 / 1,725. The 23 notification wrappers and 60 frontend warnings are separately classified follow-up debt, not TD-263 failures; no TD-263-owned failures, errors, or unclassified warnings remain. Clean-checkout verification is still required.
7. A real Chrome, no-mock journey against the local/deployed backend selects a status and search filter, observes the corresponding request, and proves every visible returned row matches both filters. The aggregate is 3 passed / 1 approval-gated skipped in 1.2m. A focused Quality route regression records the separate readiness case where the Project selector is absent during fleet bootstrap and appears after resolution; no production change was justified by the sequential real-Chrome reproduction.
8. The plan records focused evidence, all current dirty-worktree gate evidence, the warning ledger, the browser proof, the Doctor findings, the bootstrap-coupling follow-up, and the final **in-progress** TD-263 status. The track may be marked complete after clean-checkout acceptance passes; no commit or clean-checkout verification is performed in this docs lane.

## Out of Scope

- Notification mutation authorization is a separately recorded next **P0 security track**. No notification authz implementation or acceptance is included here.
- Bounded Factory activation, credentialed one-task acceptance, and any approval-gated mutation remain in `bounded_factory_activation_20260808`; this track neither runs nor closes that acceptance.
- Re-adding deleted OpenCode, YAML pipeline, or A/B/simulation production surfaces.
- Removing or redesigning the employees/runs tables, `convex/employees.ts` handlers, legacy scheduler, unused EmployeesPage/useActiveEmployees surface, or related schema/generated ownership; that requires the separate TD-247 architectural/dead-code/schema migration.
- Redesigning analytics/history UI, changing product behavior unrelated to the contracts above, or suppressing warnings without an owner and a separate debt record.
- Updating `graph.db` during this documentation-only track-authoring task. Source implementation lanes must perform the required incremental graph updates after their changes.
