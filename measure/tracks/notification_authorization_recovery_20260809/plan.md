# Plan: Notification product retirement

## Phase 1: Contract & Schema Definition

- [x] Task 1.1: Record the authoritative notification retirement baseline
  - [x] Preserve the TD-263 evidence: 24 notification tests passed, 0 failed, and 23 direct-wrapper warnings (9/9/5).
  - [x] Inventory `convex/notifications.ts`, schema declarations/indexes, generated API references, Pivot routes, all production emitters, frontend pages/hooks/routes/navigation/settings, and their tests.
  - [x] Record the final decision: retire the active notification product; preserve Alerts, task state/history, and execution logs as operator truth.
- [x] Task 1.2: Freeze the retirement and preservation contracts
  - [x] Define the absence contract for the public Convex notification module/API, webhook action, Pivot routes, emitters, frontend surfaces, and weak tests.
  - [x] Define the temporary non-addressable boundary for `notifications` and `notificationPreferences` schema declarations.
  - [x] Add TD-265 as the separate owner for retention, migration, and eventual schema/data deletion; do not remove tables/data in this track.
- [x] Task 1.3: Define source/AST acceptance guards and budgets
  - [x] Specify stable guards for no public notification exports, no generated `api.notifications` module, no route registration, no production emitters, and no frontend notification product imports.
  - [x] Freeze budgets: 0 notification warnings, 0 notification test failures, 0 unclassified notification references, and 0 browser mutations.
  - [x] Confirm no auth foundation, per-user check, compatibility API, or credentialed factory mutation is part of the retirement.

## Phase 2: Test

- [x] Task 2.1: Add source/AST guards for Convex and schema boundary retirement
  - [x] Add `convex/notification-retirement.contract.test.ts` as a source/AST contract suite, not a `convex-test` runtime suite.
  - [x] Assert `convex/notifications.ts` and all public/internal notification function registrations are absent from source and generated API output.
  - [x] Assert `deliverWebhook` and notification function references are absent while `notifications` and `notificationPreferences` table declarations remain present and non-addressable.
  - [x] Assert TD-265 is the only recorded owner for later schema/data deletion.
- [x] Task 2.2: Add source/AST guards for Pivot and production caller retirement
  - [x] Assert `pivot/src/routes/notifications.ts`, server registration, fake email route, and all orchestrator/budget/retrospective notification calls are absent.
  - [x] Assert operator-truth paths for Alerts, task state/history, and execution logs remain referenced and are not replaced by a notification adapter.
  - [x] Keep the guard source-based and deterministic; do not replace the deleted runtime with mock context tests.
- [x] Task 2.3: Add source/AST guards for frontend surface retirement
  - [x] Assert notification pages, hooks/types, route entries, nav/settings links, hardcoded `admin:system`, and notification component tests are absent.
  - [x] Assert live settings, history, Alerts, task state, and execution-log routes remain in the router where applicable.
  - [x] Ensure no frontend request path targets `/api/notifications/*`.
- [x] Task 2.4: Add the no-mock real-browser retirement contract
  - [x] Add `@live @notification-retirement` coverage for `/notifications` and `/settings/notifications` against the real stack and system Chrome.
  - [x] Assert each URL remains at the requested path, renders the truthful 404/unknown-route state, and does not redirect or silently navigate.
  - [x] Capture failed responses, console/page errors, and requests; assert no `/api/notifications/*` request and no POST/PUT/PATCH/DELETE/import/seed/dispatch action.

## Phase 3: Implement

- [x] Task 3.1: Remove the public Convex notification module and preserve schema tables
  - [x] Delete `convex/notifications.ts`, `convex/lib/notifications.ts`, generated public notification API reachability, and the three weak direct-wrapper suites.
  - [x] Leave only the `notifications` and `notificationPreferences` schema declarations as a temporary non-addressable data-preservation boundary.
  - [x] Delete the notification-only helper test; retain or rewrite `convex/schema.notifications.test.ts` solely as the TD-265 schema-preservation guard.
  - [x] Remove stale notification validator imports/types only when they are no longer needed by the preserved schema declarations or other live contracts.
- [x] Task 3.2: Remove fake and external delivery surfaces
  - [x] Delete `deliverWebhook` and all notification delivery exports/references.
  - [x] Delete `pivot/src/routes/notifications.ts`, its server registration, fake `/send-email`, and notification route tests.
  - [x] Confirm no alternate email/webhook/notification adapter is added.
- [x] Task 3.3: Remove production notification emitters
  - [x] Remove notification calls from orchestrator success/failure/retry paths, budgets, and retrospectives.
  - [x] Remove notification-only orchestrator/stage test expectations while preserving non-notification task-state, recovery, and execution-log behavior.
  - [x] Preserve failure recovery, task state transitions, execution logs, Alerts, and other operator-truth writes without a compatibility notification call.
  - [x] Remove stale generated references and update JSDoc/imports without changing unrelated behavior.
- [x] Task 3.4: Remove frontend notification product surfaces
  - [x] Delete notification history/settings pages, Convex data hooks/types, route entries, navigation/settings links, and their tests.
  - [x] Remove hardcoded `admin:system` and `/api/notifications` calls.
  - [x] Confirm the remaining router renders the existing truthful unknown-route state for retired URLs.
- [x] Task 3.5: Verify retirement is complete and schema preservation is explicit
  - [x] Run caller/source analysis for every removed export and confirm no production caller or generated API path remains.
  - [x] Confirm `notifications`/`notificationPreferences` are not addressable through `api`, `internal`, Pivot, frontend, or tests.
  - [x] Record TD-265 as the only follow-up for retention/migration/schema deletion and do not widen this track.

## Phase 4: Generate Docs & Doctor

- [x] Task 4.1: Run source absence, codegen, typecheck, and runtime gates
  - [x] Run `bun test ./convex/notification-retirement.contract.test.ts` and record exact source/AST guard counts.
  - [x] Run `bun run convex:codegen` and confirm generated API output contains no `notifications` module.
  - [x] Run `bun run ./pivot/node_modules/.bin/tsc --noEmit --project convex/tsconfig.json` and confirm the temporary schema boundary typechecks.
  - [x] Run `bun run test:convex-runtime` and `bun test ./convex`; require no notification runtime files/warnings and no unrelated regressions.
- [x] Task 4.2: Run full project tests and typechecks
  - [x] Run `bun run --cwd pivot test`, `bun run --cwd pivot typecheck`, `bun run --cwd frontend test`, and `bun run --cwd frontend check`.
  - [x] Record exact file/test/pass/fail/error counts and classify any pre-existing warnings without suppressing them.
  - [x] Confirm no package, lockfile, generated API, or graph change is left undocumented.
- [x] Task 4.3: Run real system-Chrome retirement acceptance
  - [x] Run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome bun run --cwd frontend test:e2e:live -- e2e/notification-retirement-live.spec.ts --workers=1` with no factory-acceptance flag.
  - [x] Record both retired URLs, 404/no-navigation evidence, request/response observations, console/page errors, and proof of zero notification API requests.
  - [x] Confirm the journey performs no mutation, import, seed, dispatch, credential use, or Bounded Factory action.
- [x] Task 4.4: Run Doctor and diff checks
  - [x] Run `bash measure/doctor.sh all` and record only pre-existing Doctor/graph findings; do not allowlist new retirement debt.
  - [x] Run `git diff --check` and inspect the final source/AST absence report.
  - [x] Verify TD-265, not this track, owns schema/data retention and deletion.
- [x] Task 4.5: Close the P0 track truthfully
  - [x] Update metadata `actual_tasks`, registry, TD-264/TD-265 evidence, and this plan only after all retirement and browser gates pass.
  - [x] Keep status `blocked`/`in_progress` if any public notification/API/caller/frontend surface remains or browser proof is incomplete.
  - [x] Mark complete only when the active product is absent, operator truth remains live, and all exact evidence is recorded.

## Exact acceptance command set

These are the repository's current scripts and the declared retirement gate:

```bash
bun test ./convex/notification-retirement.contract.test.ts
bun run convex:codegen
bun run ./pivot/node_modules/.bin/tsc --noEmit --project convex/tsconfig.json
bun run test:convex-runtime
bun test ./convex
bun run --cwd pivot test
bun run --cwd pivot typecheck
bun run --cwd frontend test
bun run --cwd frontend check
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome bun run --cwd frontend test:e2e:live -- e2e/notification-retirement-live.spec.ts --workers=1
bash measure/doctor.sh all
git diff --check
```

The historical notification baseline command remains diagnostic evidence only:

```bash
bun test ./convex/notifications.batching.test.ts ./convex/notifications.partialUpdate.test.ts ./convex/notifications.preferences.test.ts
```

It recorded 24 passed / 0 failed / 23 direct-wrapper warnings before retirement. Those deleted
files must not be recreated to satisfy the baseline.

## Closeout evidence — 2026-08-09

TD-264 is complete. The active notification product was removed in `fe2a5bb3`; the unrelated
suite-order defect exposed by clean-checkout acceptance was repaired in `a03f2229`; and stale
notification allowlist entries plus their regression guard were closed in `63d34aac`.

- Retirement contract: 6/6 passed with 71 assertions. It proves runtime/API/route/frontend
  absence, the temporary non-addressable schema boundary, live operator-truth wiring, no mock
  browser setup, and no retired notification path in Doctor allowlists.
- Clean archive of `a03f2229` with no `.env.local`: Convex runtime 21 files / 105 tests; remaining
  Convex 31 files / 922 tests; Pivot 148 files / 1,709 tests; frontend 172 files / 1,252 tests in
  382.38 seconds. Convex and Pivot typechecks, frontend format/lint/typecheck, and production build
  all passed. The build transformed 2,800 modules and retained the known 1,282.03 kB / 362.55 kB
  gzip main-chunk advisory.
- Weak-test repair: full-suite Pivot originally returned `no_tasks` in three parity tests although
  the file passed 17/17 alone. A two-file reproduction identified module-level Bun mocks in
  `scoreCandidates.test.ts`; replacing them with real-collaborator/fake-client tests made the full
  archive suite pass 1,709/1,709.
- Real browser: system Chrome ran the no-mock `@notification-retirement` journey against the live
  Vite -> Pivot -> Convex stack: 3/3 passed in 49.1 seconds. `/notifications` and
  `/settings/notifications` stayed truthful 404s, `/settings/app` exposed no notification entry,
  and all three cold loads had zero notification API requests, mutations, unrecovered backend
  failures, page errors, or console errors.
- Doctor: as-any, boundary, stub-mutation, and status-vocabulary checks pass. Notification-specific
  stale allowlist entries are gone. The pre-existing 516-line `qualityWorkflowRunner.ts`, unrelated
  stale allowlist entries, and 65 graph-reported orphan exports remain visible; graph audit quality
  remains GitHub issue #2.
- Graph: the TD-264 rebuild succeeded before the final test-only updates; incremental updates leave
  the canonical graph synchronized at 5,629 nodes, 7,895 edges, and 670 files. No package or
  lockfile changed. Generated `api.d.ts` contains no notification module.

TD-265 is the sole follow-up owner for deciding whether historical `notifications` and
`notificationPreferences` rows require retention/export before their schema declarations are
deleted. No credentialed Bounded Factory mutation was run.
