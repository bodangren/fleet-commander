# Test Strategy: Notification product retirement

## Evidence principle

The 23 TD-263 warnings came from direct calls to decorated Convex functions with hand-built
contexts. Because the product is being retired, the correct green proof is absence, not a new
registered notification runtime suite:

1. Source/AST guards prove the public notification module, API references, callers, routes,
   frontend surfaces, and weak tests are gone.
2. Schema/codegen/typecheck guards prove `notifications` and `notificationPreferences` remain only
   as temporary non-addressable declarations owned by TD-265.
3. Full runtime and project gates prove retirement does not break supported operator truth.
4. Real system-Chrome E2E proves retired URLs remain 404/no-navigation states and make no
   notification API request. Browser E2E is the real backend/network evidence.

`convex-test` is an in-process JavaScript mock runtime, not a local or deployed Convex backend. No
`*.convex-test.ts` notification suite is required after the module is removed.

## Baseline warning ledger

| Source | Tests | Current warnings | Retirement outcome |
| --- | ---: | ---: | --- |
| `convex/notifications.batching.test.ts` | 9 | 9 | Delete with retired module; source/AST absence guard replaces it |
| `convex/notifications.partialUpdate.test.ts` | 10 | 9 | Delete with retired module; source/AST absence guard replaces it |
| `convex/notifications.preferences.test.ts` | 5 | 5 | Delete with retired module; source/AST absence guard replaces it |
| **Total** | **24** | **23** | **0 notification warnings; no notification runtime suite** |

The historical baseline command was:

```bash
bun test ./convex/notifications.batching.test.ts ./convex/notifications.partialUpdate.test.ts ./convex/notifications.preferences.test.ts
```

It recorded 24 passed, 0 failed, 70 expect calls, and 23 direct-wrapper warnings. It is diagnostic
history only; deleted files must not be recreated to preserve the count.

## Source/AST retirement guards

Implement the guard as `convex/notification-retirement.contract.test.ts` (a regular Bun source
contract test, not a `*.convex-test.ts` file) and run it with:

```bash
bun test ./convex/notification-retirement.contract.test.ts
```

The guard suite must deterministically assert:

- `convex/notifications.ts` and all public/internal notification registrations are absent;
- `convex/lib/notifications.ts` and its notification-only helper tests are absent;
- generated `api.d.ts` has no `notifications` module and no `api.notifications.*` references;
- `deliverWebhook`, notification validators used only by the deleted module, and stale generated
  imports are absent unless still required by the preserved schema declarations;
- `pivot/src/routes/notifications.ts`, server registration, `/api/notifications/*`, fake email,
  and all orchestrator/budget/retrospective notification calls are absent;
- frontend notification pages, hooks/types, route entries, nav/settings links, hardcoded
  `admin:system`, and notification tests are absent;
- notification-only orchestrator/stage assertions are absent while task-state, recovery, and
  execution-log tests remain;
- `notifications` and `notificationPreferences` remain in schema declarations but have no
  addressable `api`, `internal`, Pivot, frontend, or test caller; the only permitted test is the
  TD-265 schema-preservation guard;
- Alerts, task state/history, execution logs, and other operator-truth paths remain present;
- TD-265 is the only follow-up owner for retention/migration/schema-data deletion.

These guards are source/AST contracts, not a substitute for a runtime notification test. They must
fail if a future change revives the retired product or silently removes the preservation boundary.

## Full runtime and project gates

Use the scripts that exist in the repository:

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
bash measure/doctor.sh all
git diff --check
```

Acceptance requires no notification runtime files, no notification direct-wrapper warnings, no
unclassified notification references, and no regressions in supported operator-truth suites.
Existing global Doctor/graph findings must be recorded with their current owner; no new allowlist
entry may hide a stale notification surface.

## Real Chrome contract

Create `frontend/e2e/notification-retirement-live.spec.ts` tagged `@live @notification-retirement`
and run it with system Chrome when bundled Chromium is unavailable:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
  bun run --cwd frontend test:e2e:live -- e2e/notification-retirement-live.spec.ts --workers=1
```

The read-only journey must:

- open `/notifications` and `/settings/notifications` against the running local stack;
- assert each URL remains at the requested path and renders the truthful 404/unknown-route state;
- assert no redirect, silent navigation, notification page, or settings notification link exists;
- collect page errors, console errors, failed `/api/*`/Convex responses, and request paths;
- assert zero `/api/notifications/*` requests and zero POST/PUT/PATCH/DELETE/import/seed/dispatch
  requests;
- avoid `mockApp`, route interception, `seedScenario`, browser-harness, Kimi WebBridge, and the
  credentialed Bounded Factory acceptance.

This proof does not create an identity, save preferences, send email, trigger delivery, mutate
Convex, or delete preserved schema data.
