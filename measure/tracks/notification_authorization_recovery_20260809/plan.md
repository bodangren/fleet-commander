# Plan: Notification product retirement

## Phase 1: Contract & Schema Definition

- [ ] Task 1.1: Record the authoritative notification retirement baseline
  - [ ] Preserve the TD-263 evidence: 24 notification tests passed, 0 failed, and 23 direct-wrapper warnings (9/9/5).
  - [ ] Inventory `convex/notifications.ts`, schema declarations/indexes, generated API references, Pivot routes, all production emitters, frontend pages/hooks/routes/navigation/settings, and their tests.
  - [ ] Record the final decision: retire the active notification product; preserve Alerts, task state/history, and execution logs as operator truth.
- [ ] Task 1.2: Freeze the retirement and preservation contracts
  - [ ] Define the absence contract for the public Convex notification module/API, webhook action, Pivot routes, emitters, frontend surfaces, and weak tests.
  - [ ] Define the temporary non-addressable boundary for `notifications` and `notificationPreferences` schema declarations.
  - [ ] Add TD-265 as the separate owner for retention, migration, and eventual schema/data deletion; do not remove tables/data in this track.
- [ ] Task 1.3: Define source/AST acceptance guards and budgets
  - [ ] Specify stable guards for no public notification exports, no generated `api.notifications` module, no route registration, no production emitters, and no frontend notification product imports.
  - [ ] Freeze budgets: 0 notification warnings, 0 notification test failures, 0 unclassified notification references, and 0 browser mutations.
  - [ ] Confirm no auth foundation, per-user check, compatibility API, or credentialed factory mutation is part of the retirement.

## Phase 2: Test

- [ ] Task 2.1: Add source/AST guards for Convex and schema boundary retirement
  - [ ] Add `convex/notification-retirement.contract.test.ts` as a source/AST contract suite, not a `convex-test` runtime suite.
  - [ ] Assert `convex/notifications.ts` and all public/internal notification function registrations are absent from source and generated API output.
  - [ ] Assert `deliverWebhook` and notification function references are absent while `notifications` and `notificationPreferences` table declarations remain present and non-addressable.
  - [ ] Assert TD-265 is the only recorded owner for later schema/data deletion.
- [ ] Task 2.2: Add source/AST guards for Pivot and production caller retirement
  - [ ] Assert `pivot/src/routes/notifications.ts`, server registration, fake email route, and all orchestrator/budget/retrospective notification calls are absent.
  - [ ] Assert operator-truth paths for Alerts, task state/history, and execution logs remain referenced and are not replaced by a notification adapter.
  - [ ] Keep the guard source-based and deterministic; do not replace the deleted runtime with mock context tests.
- [ ] Task 2.3: Add source/AST guards for frontend surface retirement
  - [ ] Assert notification pages, hooks/types, route entries, nav/settings links, hardcoded `admin:system`, and notification component tests are absent.
  - [ ] Assert live settings, history, Alerts, task state, and execution-log routes remain in the router where applicable.
  - [ ] Ensure no frontend request path targets `/api/notifications/*`.
- [ ] Task 2.4: Add the no-mock real-browser retirement contract
  - [ ] Add `@live @notification-retirement` coverage for `/notifications` and `/settings/notifications` against the real stack and system Chrome.
  - [ ] Assert each URL remains at the requested path, renders the truthful 404/unknown-route state, and does not redirect or silently navigate.
  - [ ] Capture failed responses, console/page errors, and requests; assert no `/api/notifications/*` request and no POST/PUT/PATCH/DELETE/import/seed/dispatch action.

## Phase 3: Implement

- [ ] Task 3.1: Remove the public Convex notification module and preserve schema tables
  - [ ] Delete `convex/notifications.ts`, `convex/lib/notifications.ts`, generated public notification API reachability, and the three weak direct-wrapper suites.
  - [ ] Leave only the `notifications` and `notificationPreferences` schema declarations as a temporary non-addressable data-preservation boundary.
  - [ ] Delete the notification-only helper test; retain or rewrite `convex/schema.notifications.test.ts` solely as the TD-265 schema-preservation guard.
  - [ ] Remove stale notification validator imports/types only when they are no longer needed by the preserved schema declarations or other live contracts.
- [ ] Task 3.2: Remove fake and external delivery surfaces
  - [ ] Delete `deliverWebhook` and all notification delivery exports/references.
  - [ ] Delete `pivot/src/routes/notifications.ts`, its server registration, fake `/send-email`, and notification route tests.
  - [ ] Confirm no alternate email/webhook/notification adapter is added.
- [ ] Task 3.3: Remove production notification emitters
  - [ ] Remove notification calls from orchestrator success/failure/retry paths, budgets, and retrospectives.
  - [ ] Remove notification-only orchestrator/stage test expectations while preserving non-notification task-state, recovery, and execution-log behavior.
  - [ ] Preserve failure recovery, task state transitions, execution logs, Alerts, and other operator-truth writes without a compatibility notification call.
  - [ ] Remove stale generated references and update JSDoc/imports without changing unrelated behavior.
- [ ] Task 3.4: Remove frontend notification product surfaces
  - [ ] Delete notification history/settings pages, Convex data hooks/types, route entries, navigation/settings links, and their tests.
  - [ ] Remove hardcoded `admin:system` and `/api/notifications` calls.
  - [ ] Confirm the remaining router renders the existing truthful unknown-route state for retired URLs.
- [ ] Task 3.5: Verify retirement is complete and schema preservation is explicit
  - [ ] Run caller/source analysis for every removed export and confirm no production caller or generated API path remains.
  - [ ] Confirm `notifications`/`notificationPreferences` are not addressable through `api`, `internal`, Pivot, frontend, or tests.
  - [ ] Record TD-265 as the only follow-up for retention/migration/schema deletion and do not widen this track.

## Phase 4: Generate Docs & Doctor

- [ ] Task 4.1: Run source absence, codegen, typecheck, and runtime gates
  - [ ] Run `bun test ./convex/notification-retirement.contract.test.ts` and record exact source/AST guard counts.
  - [ ] Run `bun run convex:codegen` and confirm generated API output contains no `notifications` module.
  - [ ] Run `bun run ./pivot/node_modules/.bin/tsc --noEmit --project convex/tsconfig.json` and confirm the temporary schema boundary typechecks.
  - [ ] Run `bun run test:convex-runtime` and `bun test ./convex`; require no notification runtime files/warnings and no unrelated regressions.
- [ ] Task 4.2: Run full project tests and typechecks
  - [ ] Run `bun run --cwd pivot test`, `bun run --cwd pivot typecheck`, `bun run --cwd frontend test`, and `bun run --cwd frontend check`.
  - [ ] Record exact file/test/pass/fail/error counts and classify any pre-existing warnings without suppressing them.
  - [ ] Confirm no package, lockfile, generated API, or graph change is left undocumented.
- [ ] Task 4.3: Run real system-Chrome retirement acceptance
  - [ ] Run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome bun run --cwd frontend test:e2e:live -- e2e/notification-retirement-live.spec.ts --workers=1` with no factory-acceptance flag.
  - [ ] Record both retired URLs, 404/no-navigation evidence, request/response observations, console/page errors, and proof of zero notification API requests.
  - [ ] Confirm the journey performs no mutation, import, seed, dispatch, credential use, or Bounded Factory action.
- [ ] Task 4.4: Run Doctor and diff checks
  - [ ] Run `bash measure/doctor.sh all` and record only pre-existing Doctor/graph findings; do not allowlist new retirement debt.
  - [ ] Run `git diff --check` and inspect the final source/AST absence report.
  - [ ] Verify TD-265, not this track, owns schema/data retention and deletion.
- [ ] Task 4.5: Close the P0 track truthfully
  - [ ] Update metadata `actual_tasks`, registry, TD-264/TD-265 evidence, and this plan only after all retirement and browser gates pass.
  - [ ] Keep status `blocked`/`in_progress` if any public notification/API/caller/frontend surface remains or browser proof is incomplete.
  - [ ] Mark complete only when the active product is absent, operator truth remains live, and all exact evidence is recorded.

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
