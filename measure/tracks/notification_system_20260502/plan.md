# Notification System — Implementation Plan

> **Symphony Compliance:** Add Symphony-specific event triggers: hook failures, session resumption, backoff exhaustion, retry cap reached. Reference `HookResult.exitCode` and `SYMPHONY_RETRY_CONFIG`.

## Phase 1: Notification Data Model

- [x] Define `notifications` table schema in Convex (`convex/schema.ts`)
- [x] Define notification type enum including Symphony events: `hook_failure`, `session_resumed`, `backoff_exhausted`, `retry_cap_reached` (`convex/lib/validators.ts`)
- [x] Define channel config schema (`channel` field on notification + `in_app`/`webhook`/`email` union)
- [x] Build `createNotification` mutation with deduplication logic (`convex/notifications.ts`)
- [x] Build `getUserNotifications` query with filters (type, read, date) (`convex/notifications.ts`)
- [x] Build `markRead` and `markAllRead` mutations (`convex/notifications.ts`)
- [x] Build `deleteOldNotifications` cleanup function (30-day purge) (`convex/notifications.ts`)
- [x] Write unit tests for deduplication and cleanup logic (`convex/lib/notifications.test.ts`)

## Phase 2: Event Triggers

- [x] Wire task completion → notification (assigned user / project owner)
- [x] Wire task failure → notification (project owner)
- [x] Wire budget threshold breach → notification (admin users)
- [x] Wire circuit breaker open → notification (admin users)
- [x] Wire sprint completion → notification (project members)
- [x] Wire retrospective ready → notification (project owner)
- [x] Wire `HookResult.exitCode !== 0` → `hook_failure` notification (admin users)
- [x] Wire `RetryManager.getMaxRetries()` exhaustion → `backoff_exhausted` notification (project owner)
- [x] Wire session resumption on retry → `session_resumed` notification (debug channel, opt-in)
- [x] Implement notification preference lookup before creating
- [x] Write integration tests for each event trigger

## Phase 3: Delivery Channels

- [x] Build `NotificationBadge` component (unread count in header)
- [x] Build `NotificationDropdown` panel component
- [x] Build `NotificationHistory` page with filters and bulk actions
- [x] Build `NotificationPreferences` settings UI (including Symphony event toggle)
- [x] Implement webhook delivery (POST to configured URL)
- [x] Implement email delivery (SMTP config and send function)
- [x] Wire preferences UI to user notification config
- [x] End-to-end test: trigger event → notification created → appears in UI → webhook fires
