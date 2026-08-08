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

- [ ] Task 2.1: Turn the TD-264 preservation guard into a full-deletion guard
  - [ ] Change the retirement contract to reject both schema table names and notification-only validators/types.
  - [ ] Keep runtime/API/Pivot/frontend/allowlist absence assertions and operator-truth assertions.
  - [ ] Demonstrate the revised contract is red before production schema edits.
- [ ] Task 2.2: Repair schema and validator contracts
  - [ ] Remove expectations that historical notification vocabulary is imported by the schema.
  - [ ] Add exact schema-table absence coverage without relying on generated graph nodes.
  - [ ] Keep the canonical validator inventory internally consistent after removal.
- [ ] Task 2.3: Preserve real-browser and no-mutation contracts
  - [ ] Keep `notification-retirement-live.spec.ts` free of mocks, route interception, seeds, and mutation requests.
  - [ ] Require real `/api/health` 200 plus finite 404/settings states and zero notification API traffic.
  - [ ] Do not add arbitrary waits or accept unrecovered backend failures.

## Phase 3: Implement

- [ ] Task 3.1: Remove both schema tables
  - [ ] Delete the `notifications` and `notificationPreferences` declarations and all table-specific indexes.
  - [ ] Remove their validator imports from `convex/schema/operations.ts`.
  - [ ] Confirm the local Convex watcher applies the empty-table schema update without data migration.
- [ ] Task 3.2: Remove notification-only validators and types
  - [ ] Delete `notificationType`, `notificationChannel`, `NotificationType`, and `NotificationChannel`.
  - [ ] Remove stale tests, comments, and inventory entries that existed only for the temporary boundary.
  - [ ] Preserve unrelated UI toasts and operator-truth vocabulary.
- [ ] Task 3.3: Regenerate and typecheck the reduced Convex boundary
  - [ ] Run codegen or verify watcher-generated output and confirm no notification table/module references.
  - [ ] Run the Convex TypeScript project and registered runtime contracts.
  - [ ] Add no compatibility schema, API, migration, or package dependency.
- [ ] Task 3.4: Reconcile durable product/workflow/debt documentation
  - [ ] Remove stale claims that notifications remain canonical state or scheduler behavior.
  - [ ] Move TD-264 and TD-265 to resolved evidence without deleting the durable audit history.
  - [ ] Keep the remote-preflight limitation explicit.

## Phase 4: Generate Docs & Doctor

- [ ] Task 4.1: Run focused Convex deletion gates
  - [ ] Run the full-deletion source contract and relevant schema/validator tests.
  - [ ] Run Convex typecheck, `test:convex-runtime`, and all remaining Convex tests with exact counts.
  - [ ] Confirm no notification-only warning, test, module, table, or type remains.
- [ ] Task 4.2: Run full clean project gates
  - [ ] Run full Pivot tests/typecheck and frontend tests/check/build from a clean archive.
  - [ ] Record exact counts and classify only already-owned warnings without suppressing them.
  - [ ] Run `git diff --check` and confirm no package/lockfile/local database artifact changed.
- [ ] Task 4.3: Run real system-Chrome acceptance
  - [ ] Run the TD-264 retirement spec against the live Vite -> Pivot -> Convex stack with system Chrome.
  - [ ] Require 3/3 finite routes, real health 200, zero notification API calls/mutations, and no unrecovered errors.
  - [ ] Confirm no factory action, credentials, import, seed, dispatch, or continuous-mode mutation occurs.
- [ ] Task 4.4: Close TD-265 truthfully
  - [ ] Run Doctor and graph synchronization; preserve unrelated issue #2/Doctor debt without new allowlists.
  - [ ] Update metadata, registry, tech debt, audit report, actual task count, and remote-preflight evidence.
  - [ ] Mark complete only after the schema, vocabulary, tests, live watcher, and Chrome proof are green.

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
