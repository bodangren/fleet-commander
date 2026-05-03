# Notification System — Implementation Plan

> **Symphony Compliance:** Add Symphony-specific event triggers: hook failures, session resumption, backoff exhaustion, retry cap reached. Reference `HookResult.exitCode` and `SYMPHONY_RETRY_CONFIG`.

## Phase 1: Notification Data Model

- [ ] Define `notifications` table schema in Convex
- [ ] Define notification type enum including Symphony events: `hook_failure`, `session_resumed`, `backoff_exhausted`, `retry_cap_reached`
- [ ] Define channel config schema
- [ ] Build `createNotification` mutation with deduplication logic
- [ ] Build `getUserNotifications` query with filters (type, read, date)
- [ ] Build `markRead` and `markAllRead` mutations
- [ ] Build `deleteOldNotifications` cleanup function (30-day purge)
- [ ] Write unit tests for deduplication and cleanup logic

## Phase 2: Event Triggers

- [ ] Wire task completion → notification (assigned user / project owner)
- [ ] Wire task failure → notification (project owner)
- [ ] Wire budget threshold breach → notification (admin users)
- [ ] Wire circuit breaker open → notification (admin users)
- [ ] Wire sprint completion → notification (project members)
- [ ] Wire retrospective ready → notification (project owner)
- [ ] Wire `HookResult.exitCode !== 0` → `hook_failure` notification (admin users)
- [ ] Wire `RetryManager.getMaxRetries()` exhaustion → `backoff_exhausted` notification (project owner)
- [ ] Wire session resumption on retry → `session_resumed` notification (debug channel, opt-in)
- [ ] Implement notification preference lookup before creating
- [ ] Write integration tests for each event trigger

## Phase 3: Delivery Channels

- [ ] Build `NotificationBadge` component (unread count in header)
- [ ] Build `NotificationDropdown` panel component
- [ ] Build `NotificationHistory` page with filters and bulk actions
- [ ] Build `NotificationPreferences` settings UI (including Symphony event toggle)
- [ ] Implement webhook delivery (POST to configured URL)
- [ ] Implement email delivery (SMTP config and send function)
- [ ] Wire preferences UI to user notification config
- [ ] End-to-end test: trigger event → notification created → appears in UI → webhook fires
