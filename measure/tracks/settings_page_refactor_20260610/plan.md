# Plan: Settings Page Refactor and Notification Preferences

## Phase 1: Characterization Tests (TDD — Red)

- [ ] Write characterization tests for current SettingsPage behavior:
  - [ ] Notification toggle renders current state from query.
  - [ ] Toggle calls mutation with inverted value.
  - [ ] Mutation failure restores previous toggle state.
- [ ] Run tests; confirm they pass against existing (buggy) code.

## Phase 2: Convex Schema + Single Source of Truth

- [ ] Add `notificationPreferences` table to Convex schema (or extend `users`):
  - [ ] Fields: `emailSprints`, `emailBudget`, `inAppAlerts`, `budgetThresholdPercent`.
- [ ] Write `getNotificationPreferences` query with strong typing.
- [ ] Write `updateNotificationPreference` mutation with validation.
- [ ] Write unit tests for query + mutation.

## Phase 3: Extract Sub-Components (TDD — Green)

- [ ] Create `NotificationSettingsSection` component (< 200 lines):
  - [ ] Reads from `getNotificationPreferences`.
  - [ ] Optimistic toggle with rollback on error.
- [ ] Create `AgentDefaultsSection` component (moved from SettingsPage).
- [ ] Create `ProfileSettingsSection` component (moved from SettingsPage).
- [ ] Create `SettingsLayout` with sidebar navigation.
- [ ] Update React Router routes for `/settings`, `/settings/notifications`, `/settings/agents`, `/settings/profile`.

## Phase 4: Delete God-File + Wire Routes

- [ ] Delete `SettingsPage.tsx`.
- [ ] Update `AppLayout` sidebar to link to `/settings`.
- [ ] Update any direct imports of SettingsPage to new sub-pages.
- [ ] Run orphan check: ensure no dead imports remain.

## Phase 5: Verification

- [ ] Run `pivot test` — all settings tests pass.
- [ ] Run `pivot typecheck` — zero errors.
- [ ] Run `doctor.sh` — no new orphans, no new `as any`.
- [ ] Update `tech-debt.md`: mark TD-216 as resolved.
- [ ] Update `lessons-learned.md`: add note on optimistic-mutation rollback pattern.
