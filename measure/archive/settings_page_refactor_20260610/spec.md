# Track: Settings Page Refactor and Notification Preferences

## Problem

`SettingsPage.tsx` is a **god-file** that bundles application configuration, notification preferences, user profile, and agent defaults into a single unmaintainable surface. It also contains a **notification preference source-of-truth race**: local React state, Convex mutation, and a cached query can diverge, causing toggle flips to appear reversed or lost on refresh.

## Goal

Split `SettingsPage.tsx` into focused, routed sub-pages with a single source of truth for notification preferences backed by Convex, and remove the god-file entirely.

## Acceptance Criteria

1. `SettingsPage.tsx` is deleted; no component exceeds 250 lines.
2. Notification preferences (email, in-app, sprint alerts, budget warnings) are stored in Convex with optimistic UI updates.
3. No source-of-truth race: local state is a mirror of the query, mutations update Convex first, UI rolls back on mutation failure.
4. Settings nav is accessible from `AppLayout` sidebar.
5. All existing settings functionality is preserved or explicitly deprecated with a track ID.
6. Tests cover preference mutation success, failure rollback, and optimistic render.

## Non-Goals

- Redesigning the visual appearance of settings (keep existing Tailwind classes).
- Adding new notification channels (SMS, Slack, etc.) — defer to future track.
- Migrating to a third-party settings provider.

## Related Tech Debt

- TD-216: SettingsPage god-file + notification preference race.
- TD-237: Latent type bugs on insights/projects (adjacent; verify while in settings area).

## Verification

- `pivot test` passes (new + existing settings tests).
- `pivot typecheck` passes.
- `doctor.sh` orphan check: old SettingsPage imports removed.
