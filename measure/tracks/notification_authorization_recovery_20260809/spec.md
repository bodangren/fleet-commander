# Spec: Notification product retirement

## Overview

Retire the active notification product as the explicit P0 recovery decision. The two independent
audits agree that the repository has a provider configuration but no persisted users/identities
keyed to Convex identity, while the frontend uses plain `ConvexProvider` and sends no auth token.
Adding public per-user checks against caller-supplied IDs would therefore be fake security. The
safe outcome is less surface area: remove the addressable notification product and its delivery
paths instead of preserving them behind an unverifiable ownership model.

TD-263 recorded the warning baseline in three weak direct-wrapper suites:

- `convex/notifications.batching.test.ts` — 9 warnings;
- `convex/notifications.partialUpdate.test.ts` — 9 warnings;
- `convex/notifications.preferences.test.ts` — 5 warnings.

The baseline is evidence only: 24 tests passed, 0 failed, and 23 direct-wrapper warnings. Because
no notification functions remain after this track, no registered notification runtime suite is
needed. The replacement evidence is source/AST surface-retirement guards, generated API/codegen
absence, full typecheck/runtime gates, and real Chrome proving removed routes do not navigate or
call notification APIs.

## Decision and preservation boundary

The active product is retired. The following are implementation requirements, not open options:

- remove the public `convex/notifications.ts` module/API and all public notification function
  references;
- remove the notification-only `convex/lib/notifications.ts` helper/test surface; keep only a
  schema-preservation contract for the temporary tables;
- remove the public arbitrary-URL `deliverWebhook` action;
- remove the fake Pivot email route and every Pivot notification route registration;
- remove orchestrator, budget, and retrospective notification emitters and their stale generated
  references;
- remove frontend notification pages, hooks, routes, navigation/settings entries, and their tests;
- preserve existing Alerts, task state, task history, execution logs, and other operator-truth
  surfaces as the supported operational record;
- retain `notifications` and `notificationPreferences` schema declarations only as a temporary,
  non-addressable data-preservation boundary. They must not have a public or internal function
  path in this track. TD-265 owns the later retention, migration, and schema/data deletion decision.

No users/identities table, auth-provider integration, `ConvexProviderWithAuth`, or per-user check is
added here. No public API is retained merely to satisfy an existing test or frontend import.

## Functional Requirements

### FR-1: Retire the Convex notification surface

- `convex/notifications.ts`, its generated public API module, and all notification function
  registrations are absent after implementation.
- The arbitrary-URL `deliverWebhook` action is absent and cannot be reached through `api` or an
  HTTP route.
- The temporary schema declarations remain non-addressable and are explicitly linked to TD-265.

### FR-2: Retire fake and unused delivery paths

- Remove `pivot/src/routes/notifications.ts`, its server registration, and its route tests.
- Remove the fake `/api/notifications/send-email` route rather than reporting queued delivery for a
  logger-only implementation.
- Remove all Pivot/orchestrator notification emitters and production calls; failure recovery and
  success paths continue through task state, execution logs, and other operator-truth records.

### FR-3: Retire frontend notification product surfaces

- Remove `NotificationHistoryPage`, `NotificationSettingsSection`, notification data hooks/types,
  `/notifications` and `/settings/notifications` routes, navigation/settings links, and their
  tests.
- No hardcoded `admin:system` notification identity or fake preference persistence remains.
- Existing settings, history, alerts, task status, and logs remain reachable where they are live
  and independently supported.

### FR-4: Remove weak notification tests and replace them with retirement guards

- Remove the three warning-producing direct-wrapper suites and any redundant notification route or
  component/orchestrator tests that assert the deleted product. The schema declaration test may
  remain only as a TD-265 preservation guard.
- Add source/AST contract guards proving the retired module, exports, routes, callers, frontend
  surfaces, and generated API references stay absent.
- Keep only unrelated pure logic tests when they protect a still-live operator-truth behavior; do
  not create a `*.convex-test.ts` notification runtime suite.
- The full discovered Convex suite must report zero notification direct-wrapper warnings because no
  notification functions or decorated wrappers remain.

### FR-5: Prove route retirement in real Chrome

- Add a tagged `@live @notification-retirement` system-Chrome journey against the real local stack.
- `/notifications` and `/settings/notifications` remain at their requested URLs and render the
  truthful 404/unknown-route state; they do not redirect or silently navigate to another product
  page.
- The journey observes no `/api/notifications/*` request and performs no mutation, import, seed,
  dispatch, preference save, or credentialed Bounded Factory action.

## Non-Functional Requirements

- Fail closed by deletion: no fake authorization, fake delivery, or compatibility API remains.
- Preserve strict schema validators for the temporary tables and document the retention boundary;
  do not delete existing notification data/schema in this track.
- Prefer direct removal over adapters, tombstone APIs, or alternate notification implementations.
- Keep live Alerts, task state/history, and execution logs as operator truth.
- Keep exported-function JSDoc and generated API/typecheck outputs consistent.
- Do not add allowlist entries or suppress warnings to hide a stale notification reference.

## Acceptance Criteria

1. Source/AST guards prove the public Convex notification module/API, arbitrary webhook action,
   Pivot notification routes/registration, production emitters, frontend notification surfaces,
   and weak notification tests are absent.
2. `notifications` and `notificationPreferences` remain only as temporary non-addressable schema
   declarations, with TD-265 recorded as the separate retention/migration owner.
3. Full runtime absence, Convex codegen/typecheck, Pivot/frontend tests and typechecks, and Doctor
   checks pass with zero notification warnings, failures, or unclassified references.
4. Alerts, task state, task history, and execution logs remain the operator-truth surfaces and are
   not replaced by a new notification compatibility path.
5. Real system Chrome proves both retired notification URLs remain truthful 404/no-navigation
   states and makes no notification API request, with no mocks or browser mutations.
6. The exact source-guard, absence, typecheck, codegen, full-gate, browser, Doctor, and diff
   commands plus counts are recorded in `plan.md` before completion.

## Out of Scope

- Adding public per-user authorization checks, a users/identities table, an auth provider, or
  `ConvexProviderWithAuth`.
- Deleting notification tables/data or deciding retention/migration policy; that is TD-265.
- Replacing notifications with email, webhook, toast, alert, task-state, or another delivery
  product.
- Credentialed Bounded Factory activation or any browser mutation.
- Unrelated Convex warning clusters, frontend React `act` warnings, employees/runs cleanup, or
  graph/Doctor scanner remediation.
