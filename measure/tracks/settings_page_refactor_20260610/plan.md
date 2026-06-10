# Plan: Settings Page Refactor and Notification Preferences

## Phase 1: Characterization Tests (TDD — Red)

- [x] Write characterization tests for current SettingsPage behavior: (`9b1ceb1`)
  - [x] Notification toggle renders current state from query. — `frontend/src/pages/settings/NotificationSettingsSection.test.tsx:49` `renders toggles seeded from the Convex query`
  - [x] Toggle calls mutation with inverted value. — `frontend/src/pages/settings/NotificationSettingsSection.test.tsx:72` `optimistically reflects the toggle and POSTs the inverted value`
  - [x] Mutation failure restores previous toggle state. — `frontend/src/pages/settings/NotificationSettingsSection.test.tsx:109` `rolls back the toggle and shows an error toast when the mutation fails`
- [x] Run tests; confirm they pass against existing (buggy) code. (`ac203ee` — 6 passed, 0 failed)

### Phase 1 evidence (2026-06-10, MID role)

Phase 1 is **characterization**, not failure-driven Red (see test-strategy §5). The
3 required cases already exist in `NotificationSettingsSection.test.tsx` along with
3 hardening cases (loading hint, Convex-unavailable hint, no SoT race after override
clears). Targeted bounded command (file-scoped, no watch, no full-suite smoke):

```
$ bun --cwd frontend test src/pages/settings/NotificationSettingsSection.test.tsx --run
$ vitest run --config vitest.config.ts src/pages/settings/NotificationSettingsSection.test.tsx --run
 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  19:30:14
   Duration  5.22s
```

Fail count: 0. All 3 sub-task contracts are satisfied. If the race bug re-emerges in
later phases, the `rolls back…` and `reflects updated query results once the
override clears` tests will turn red and block the regression. No new tests were
added (would have been redundant); no feature logic was implemented.

Graph context: `build-graph search "Notification"` confirms the live code path
(`useNotificationPreferences` → Convex `notifications.ts`). The graph is currently
stale on `frontend/src/pages/settings/*` (added after the last scan at 12:08).
Per Red-phase boundary rules and test-strategy §6, `build-graph update` for the
new subtree AND the `SettingsPage.tsx` orphan cleanup are both deferred to
Phase 4 — no graph maintenance in this phase.

### Phase 1 Green confirmation (2026-06-10, JR role)

JR re-ran the targeted Red command — still green:

```
$ bun --cwd frontend test src/pages/settings/NotificationSettingsSection.test.tsx --run
 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  7.82s
```

All 6 characterization cases pass. No source changes required — the component at
`NotificationSettingsSection.tsx` already implements optimistic toggle, rollback,
POST to `/api/notifications/preferences`, loading/null states, and SoT race
handling. `build-graph` not installed on this machine; graph-aware analysis
skipped per opt-in rules. Full gate (`npm test`) confirmed green.

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
