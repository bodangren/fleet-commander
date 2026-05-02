# Notification System

## Overview

Configurable notification pipeline for fleet events. Supports multiple delivery channels (in-app, webhook, email) with per-user preferences and notification history.

## Functional Requirements

1. **Notification Data Model**
   - New `notifications` table: `{ userId, type, title, body, channel, read, createdAt, metadata{} }`
   - Notification types: `task_completed`, `task_failed`, `budget_alert`, `circuit_breaker_open`, `sprint_completed`, `retrospective_ready`
   - Channel config per user: `{ inApp: bool, webhook: url?, email: string? }`

2. **Event Triggers**
   - Wire notification creation into orchestrator events:
     - Task completion → notify assigned user / project owner
     - Task failure → notify project owner
     - Budget threshold breach → notify admin
     - Circuit breaker open → notify admin
     - Sprint completion → notify all project members
   - Deduplication: suppress duplicate notifications within 5-minute window

3. **Delivery Channels**
   - **In-App**: notification badge count in header, notification dropdown panel, mark as read
   - **Webhook**: POST JSON payload to configured URL on each event
   - **Email** (optional): SMTP integration for email delivery

4. **Notification Preferences**
   - Per-user channel preferences (which channels for which event types)
   - Global notification toggle (mute all)
   - Preference UI in user settings

5. **Notification History**
   - List view of past notifications with filters (type, read/unread, date range)
   - Bulk actions: mark all read, delete old
   - Auto-cleanup: purge notifications older than 30 days

## Data Sources

- New `notifications` table
- `agents` — circuit breaker events
- `budgets` — threshold breach events
- `tasks` — completion/failure events
- `sprints` — sprint lifecycle events

## Acceptance Criteria

- [ ] Notification created within 1s of triggering event
- [ ] In-app badge shows correct unread count
- [ ] Webhook delivers valid JSON payload within 5s
- [ ] User preferences respected (disabled channels don't fire)
- [ ] No duplicate notifications within 5-minute window
- [ ] Notification history loadable and filterable
- [ ] Auto-cleanup removes notifications >30 days old

## Out of Scope

- Push notifications (browser/mobile push)
- Slack/Discord integration
- Notification rules engine (complex conditional routing)
- Real-time notification streaming (polling-based for MVP)
