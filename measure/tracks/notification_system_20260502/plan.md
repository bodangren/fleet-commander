# Notification System — Implementation Plan

## Phase 1: Notification Data Model

- [ ] Define `notifications` table schema in Convex
- [ ] Define notification type enum and channel config schema
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
- [ ] Implement notification preference lookup before creating
- [ ] Write integration tests for each event trigger

## Phase 3: Delivery Channels

- [ ] Build `NotificationBadge` component (unread count in header)
- [ ] Build `NotificationDropdown` panel component
- [ ] Build `NotificationHistory` page with filters and bulk actions
- [ ] Build `NotificationPreferences` settings UI
- [ ] Implement webhook delivery (POST to configured URL)
- [ ] Implement email delivery (SMTP config and send function)
- [ ] Wire preferences UI to user notification config
- [ ] End-to-end test: trigger event → notification created → appears in UI → webhook fires
