# Plan: Historical notification data disposition

## Phase 1: Contract & Schema Definition

- [x] Task 1.1: Establish the read-only data baseline
  - [x] Map `notifications` to `XFmcVXsPQ5PmcG9ssqNQwQ` through its three current indexes.
  - [x] Map `notificationPreferences` to `EdLg9sL24JCPNyZQbvJQwQ` through `by_user`.
  - [x] Record `numValues: 0` and zero stored size for both from `table_summary_v2` without writing the database.
- [x] Task 1.2: Freeze the deletion decision and remote boundary
  - [x] Select full local schema/vocabulary deletion; no migration or export is needed for zero rows.
  - [x] Record that only the anonymous local deployment is configured and remote data was not inspected.
  - [x] Require an independent zero-row preflight before this commit is applied to any other deployment.
- [x] Task 1.3: Define blast radius and acceptance budgets
  - [x] Source/graph analysis identifies only two table declarations plus two validator exports/types.
  - [x] Preserve Alerts, task state/history, recovery evidence, logs, and the TD-264 404 contract.
  - [x] Freeze budgets: zero table/vocabulary/runtime references, zero data mutations, zero browser mutations.

## Phase 2: Test

- [x] Task 2.1: Turn the TD-264 preservation guard into a full-deletion guard
  - [x] Change the retirement contract to reject both schema table names and notification-only validators/types.
  - [x] Keep runtime/API/Pivot/frontend/allowlist absence assertions and operator-truth assertions.
  - [x] Demonstrate the revised contract is red before production schema edits.
- [x] Task 2.2: Repair schema and validator contracts
  - [x] Remove expectations that historical notification vocabulary is imported by the schema.
  - [x] Add exact schema-table absence coverage without relying on generated graph nodes.
  - [x] Keep the canonical validator inventory internally consistent after removal.
- [x] Task 2.3: Preserve real-browser and no-mutation contracts
  - [x] Keep `notification-retirement-live.spec.ts` free of mocks, route interception, seeds, and mutation requests.
  - [x] Require real `/api/health` 200 plus finite 404/settings states and zero notification API traffic.
  - [x] Do not add arbitrary waits or accept unrecovered backend failures.

## Phase 3: Implement

- [x] Task 3.1: Remove both schema tables
  - [x] Delete the `notifications` and `notificationPreferences` declarations and all table-specific indexes.
  - [x] Remove their validator imports from `convex/schema/operations.ts`.
  - [x] Confirm the local Convex watcher applies the empty-table schema update without data migration.
- [x] Task 3.2: Remove notification-only validators and types
  - [x] Delete `notificationType`, `notificationChannel`, `NotificationType`, and `NotificationChannel`.
  - [x] Remove stale tests, comments, and inventory entries that existed only for the temporary boundary.
  - [x] Preserve unrelated UI toasts and operator-truth vocabulary.
- [x] Task 3.3: Regenerate and typecheck the reduced Convex boundary
  - [x] Run codegen or verify watcher-generated output and confirm no notification table/module references.
  - [x] Run the Convex TypeScript project and registered runtime contracts.
  - [x] Add no compatibility schema, API, migration, or package dependency.
- [x] Task 3.4: Reconcile durable product/workflow/debt documentation
  - [x] Remove stale claims that notifications remain canonical state or scheduler behavior.
  - [x] Move TD-264 and TD-265 to resolved evidence without deleting the durable audit history.
  - [x] Keep the remote-preflight limitation explicit.

## Phase 4: Generate Docs & Doctor

- [x] Task 4.1: Run focused Convex deletion gates
  - [x] Run the full-deletion source contract and relevant schema/validator tests — focused gate 466/466.
  - [x] Run Convex typecheck, `test:convex-runtime`, and all remaining Convex tests with exact counts — runtime 105/105 across 21 files; remaining Convex 914/914 across 31 files; Convex typecheck passed.
  - [x] Confirm no notification-only warning, test, module, table, or type remains.
- [x] Task 4.2: Run full clean project gates
  - [x] Run full Pivot tests/typecheck and frontend tests/check/build from a clean archive — Pivot 1709/1709 across 148 files; frontend 1252/1252 across 172 files; typechecks/check passed; build produced 2800 modules and main 1281.66kB/362.45 gzip with the known over-500k advisory.
  - [x] Record exact counts and classify only already-owned warnings without suppressing them.
  - [x] Run `git diff --check` and confirm no package/lockfile/local database artifact changed.
- [x] Task 4.3: Run real system-Chrome acceptance
  - [x] Run the TD-264 retirement spec against the live Vite -> Pivot -> Convex stack with system Chrome.
  - [x] Require 3/3 finite routes, real health 200, zero notification API calls/mutations, and no unrecovered errors.
  - [x] Confirm no factory action, credentials, import, seed, dispatch, or continuous-mode mutation occurs.
- [x] Task 4.4: Close TD-265 truthfully
  - [x] Run Doctor and graph synchronization; preserve unrelated issue #2/Doctor debt without new allowlists.
  - [x] Update metadata, registry, tech debt, audit report, actual task count, and remote-preflight evidence.
  - [x] Mark complete only after the schema, vocabulary, tests, live watcher, and Chrome proof are green.

## Acceptance commands

```bash
bun test ./convex/notification-retirement.contract.test.ts ./convex/lib/validators.test.ts
bun run ./pivot/node_modules/.bin/tsc --noEmit --project convex/tsconfig.json
bun run test:convex-runtime
bun test ./convex
bun run --cwd pivot test
bun run --cwd pivot typecheck
bun run --cwd frontend test
bun run --cwd frontend check
bun run --cwd frontend build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome bun run --cwd frontend test:e2e:live -- e2e/notification-retirement-live.spec.ts --workers=1
bash measure/doctor.sh all
git diff --check
```

## Closeout evidence — 2026-08-09

The closeout was verified from clean archive commit `515f4f98` without
`.env.local`. The configured local anonymous Convex persistence tables were
mapped read-only: both `notifications` and `notificationPreferences` reported
`numValues: 0` and zero stored bytes. The watcher log records deletion of
`notifications.by_user`, `notifications.by_user_and_read`,
`notifications.by_user_and_type`, `notifications.by_created_at`, and
`notificationPreferences.by_user`, followed by “Convex functions ready”. No
direct SQLite/data mutation was performed.

Focused deletion coverage passed `466/466`. Registered Convex runtime coverage
passed `105/105` across 21 files; the remaining Convex suite passed `914/914`
across 31 files, and Convex typecheck passed. Pivot passed `1709/1709` across
148 files plus typecheck. Frontend passed `1252/1252` across 172 files,
`check`, and build (2800 modules; main bundle `1281.66kB` / `362.45kB` gzip,
with the known over-500k advisory).

Real system Chrome passed `3/3` in 1.4 minutes with real health `200`, no
mocks, route interception, seeds, mutations, or credentialed factory action.
Doctor passed as-any, boundary, stub-mutation, and status-vocabulary checks;
the only expected failures were the 516-line `qualityWorkflowRunner` god-file
and 65 unrelated orphan/stale-allowlist debt items. Graph synchronization
reported 5,646 nodes, 7,864 edges, and 671 files; graph audit noise remains
the known issue #2 limitation. `git diff --check` passed, and no package,
lockfile, local database, or generated artifact changed.

This evidence is local-deployment-specific. No remote deployment was
configured or inspected, and no remote deletion is claimed. Any other
deployment must independently prove both tables are zero-row before applying
the schema deletion.
