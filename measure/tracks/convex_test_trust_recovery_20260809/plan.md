# Plan: Convex test trust recovery

## Phase 1: Contract & Schema Definition

- [x] Task 1.1: Freeze the authoritative TD-263 baseline and ownership ledger
  - [x] Record 1,299 passed / 139 failed / 629 warnings for the 2026-08-09 baseline.
  - [x] Distinguish the historical 1,241/157 scalpel snapshot from the current baseline.
  - [x] Inventory the shared dirty Phase-A edits without treating them as accepted implementation.
- [x] Task 1.2: Define the explicit identity, validator, type, and auth.config contracts
  - [x] Require a stable authenticated identity for protected tests and preserve fail-closed production auth.
  - [x] Remove stale validator/dead type ownership left by deleted pipeline surfaces.
  - [x] Keep `auth.config.ts` environment access typed in the Convex compilation context.
- [x] Task 1.3: Define the history and analytics production contracts
  - [x] Apply project/status filtering through the composite index before the limit and keep search over-fetch bounded.
  - [x] Enrich only returned agent IDs and retain a performance contract for representative data.
  - [x] Derive analytics states from canonical validators and define the runtime metric-helper smoke.
- [x] Task 1.4: Lock test-lane ownership and non-goals
  - [x] Inventory direct-wrapper suites into migrate or retain categories; classify the employees legacy suite for removal only after the caller/source ownership audit.
  - [x] Record notification authorization as a separate next P0 security track.
  - [x] Keep Bounded Factory acceptance approval-gated and outside this track.

## Phase 2: Test

- [x] Task 2.1: Add red identity, validator, dead-type, and auth.config regressions
  - [x] Prove anonymous/direct fake contexts cannot stand in for protected runtime behavior.
  - [x] Prove deleted vocabulary cannot be reintroduced through tests or compatibility exports.
  - [x] Prove fixture environment state is restored between cases.
- [x] Task 2.2: Add red history filter/index/performance regressions
  - [x] Distinguish pre-limit status filtering from post-limit filtering with older matching rows.
  - [x] Cover status-only, search-only, combined filters, pagination, and agent-name resolution.
  - [x] Assert bounded query behavior and no all-agents collection.
- [x] Task 2.3: Add runtime conversion tests for critical unsupported direct wrappers
  - [x] Build the `convex-test` module map and invoke registered `api.*` functions in the JavaScript mock runtime.
  - [x] Use `withIdentity` for authenticated cases and assert unauthenticated rejection where applicable.
  - [x] Select the highest-leverage dependency, analytics/cost, and history suites from the inventory; classify notification wrappers for the next P0 track.
- [x] Task 2.4: Add the analytics runtime smoke and classify the employees orphan suite
  - [x] Exercise metric helpers through a registered analytics query in the `convex-test` JavaScript mock runtime with canonical schema documents.
  - [x] Remove `convex/employees.test.ts` from TD-263 acceptance after the caller/source audit; do not add a runtime replacement, production compatibility path, or revived API.
  - [x] Record employees/runs, scheduler, unused EmployeesPage/useActiveEmployees, and related schema cleanup as a separate future dead-code/schema migration decision (TD-247); do not open that track here.
- [x] Task 2.5: Add the real-browser history/filter acceptance contract
  - [x] Observe the real project-scoped history request with both status and search parameters.
  - [x] Assert HTTP success, finite loading/error state, and row-level agreement with both filters.
  - [x] Keep the journey read-only and free of route interception or mock seeding.

## Phase 3: Implement

- [x] Task 3.1: Implement Phase-A explicit identity and typed auth config
  - [x] The shared authenticated fixture was verified against registered runtime identity semantics.
  - [x] Complete production/test boundary typing and remove anonymous-only assumptions from protected reads.
  - [x] Run focused red/green tests and the Convex typecheck.
- [x] Task 3.2: Implement stale validator/dead type cleanup
  - [x] Remove the stale pipeline vocabulary export and reconcile remaining deleted-surface references.
  - [x] Confirm no production OpenCode, YAML pipeline, or A/B/simulation surface is revived; employees/runs/scheduler/unused UI-or-hook cleanup remains deferred to TD-247.
  - [x] Convex output/typecheck passes after the implementation lane.
- [x] Task 3.3: Implement history filter/index/performance repair
  - [x] Add `by_project_and_status`, indexed filtering, bounded search overscan, and ID-scoped agent lookup.
  - [x] Verify query semantics against the `convex-test` JavaScript mock runtime and representative performance fixtures; reserve real-backend proof for Chrome.
  - [x] Confirm the frontend request and returned rows agree with status/search filters.
- [x] Task 3.4: Implement canonical analytics vocabulary
  - [x] Move analytics helpers/tests toward current task statuses and shared types.
  - [x] Reconcile analytics handlers/helpers with the canonical validator vocabulary.
  - [x] Make the runtime metric-helper smoke green without fabricating observations.
- [~] Task 3.5: Migrate the selected supported direct-wrapper test suites; exclude the inconsistent employees orphan
  - [x] Convert selected critical suites to `convex-test` + `withIdentity` while preserving focused edge-case pure tests; document the JavaScript mock-runtime boundary.
  - [x] Remove `convex/employees.test.ts` from acceptance after the caller/source audit; no runtime replacement or production change is in scope.
  - [ ] Remove obsolete mock-context assumptions only after equivalent runtime coverage is green.

## Phase 4: Generate Docs & Doctor

- [x] Task 4.1: Run focused and full Convex green gates in the current worktree
  - [x] Runtime suites: 21 files / 105 tests passed after splitting the two runtime god-files and adding the shared seed helper.
  - [x] Remaining Bun suite: 35 files / 957 tests passed, 0 failed; the exact command/result is recorded below.
  - [x] Pivot: 1,725 / 1,725 passed and typecheck passed after generated budget return typing and the production-scan classifier test fix.
  - [x] Frontend: 173 files / 1,260 tests passed in 276.93s; frontend check/lint/build passed, with 2,803 build modules and an existing >500k advisory.
  - [x] Convex typecheck passed; current dirty-worktree full gates passed.
- [x] Task 4.2: Reconcile the warning budget
  - [x] TD-263-owned direct-wrapper warnings are cleared from the migrated runtime scope.
  - [x] The remaining 23 warnings are notification-only wrappers, explicitly assigned to the next P0 authorization/security track.
  - [x] Frontend unit warnings are separately classified: 59 React `act` warnings across 12 legacy files plus one duplicate-key warning in `ProjectViewPage.typedApi.test.tsx`; they are not TD-263 warnings.
  - [x] No warning is silently suppressed or quarantined as TD-263 coverage.
- [x] Task 4.3: Prove history/filter behavior in real Chrome
  - [x] Run the no-mock local-stack journey against the existing imported project.
  - [x] Capture request parameters, response status, visible matching rows, and browser error/loading evidence.
  - [x] Chrome aggregate: 3 passed / 1 approval-gated skipped in 1.2m; no mutation or Bounded Factory activation was performed.
- [x] Task 4.4: Run Measure Doctor and synchronize implementation evidence
  - [x] `bash measure/doctor.sh all` was run; as-any, boundary, stub-mutation, and status-vocabulary checks passed.
  - [x] Record the pre-existing Doctor findings: only `qualityWorkflowRunner.ts` (516 lines) remains over the god-file threshold; the same 65 orphan/allowlist findings remain. The two new runtime test god-files are split and no longer reported.
  - [x] Do not update `graph.db` during this documentation-only task; source lanes own their incremental graph updates.
- [~] Task 4.5: Close TD-263 truthfully
  - [x] Reconcile metadata, the Tracks Registry, and `measure/tech-debt.md` with the evidence above.
  - [x] Classify notification authz to its separately recorded P0 security track, frontend legacy warnings to separate follow-up debt, employees cleanup to TD-247, and Bounded Factory approval evidence untouched.
  - [ ] Mark the track complete only after clean-checkout acceptance is green; the current dirty-worktree gates are not clean-checkout evidence.

## Closeout evidence (2026-08-09)

- Runtime: `bun run vitest --run --config vitest.convex.config.ts` — **21 files / 105 tests passed** after the god-file split and shared seed-helper addition.
- Remaining Bun suite: `bun test` — **35 files / 957 tests passed / 0 failed** (`/tmp/fleet_td263_bun.out`).
- Pivot: **1,725 / 1,725 passed**; typecheck passed after generated budget return typing and the production-scan classifier test fix.
- Frontend: **173 files / 1,260 tests passed in 276.93s**; check/lint/build passed, build produced 2,803 modules with an existing >500k advisory.
- Convex typecheck: `bun run ./pivot/node_modules/.bin/tsc --noEmit --project convex/tsconfig.json` — passed.
- Warning ledger: **23 notification-only direct-wrapper warnings** remain outside TD-263 and belong to the next P0 notification authorization/security track.
- Frontend warning follow-up: **59 React `act` warnings across 12 legacy files** plus **one duplicate-key warning** in `ProjectViewPage.typedApi.test.tsx`; these are separately owned and not TD-263 warnings.
- Employees/runs/scheduler/unused UI and hook ownership remains deferred to **TD-247**; no compatibility replacement was added.
- Chrome aggregate: **3 passed / 1 approval-gated skipped in 1.2m**. The history journey proved project-scoped status+search requests and matching visible rows.
- Browser-found regressions (2): (1) the history combined-filter request/row contract was repaired and covered; (2) the Quality direct-route Project combobox was absent during fleet bootstrap, so a focused regression covers selector reveal after bootstrap resolves. Sequential Chrome passed the latter without justifying a production change or timeout weakening.
- Follow-up debt note: shared `useFleetData` bootstrap couples project controls to unrelated agents/harnesses readiness; `/api/projects` was observed taking up to **13.1s**, so the Project selector can wait on data it does not need. Preserve this as follow-up work; do not create or close a new track in TD-263.
- Clean-checkout status: current dirty-worktree full gates passed; no clean-checkout verification was performed because this task forbids committing or altering the shared worktree state.
