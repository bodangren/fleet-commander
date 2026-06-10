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

### Phase 1 adversarial correction (2026-06-10)

Supervisor gate re-ran `npm test` successfully after adversarial hardening commit
`eec701d`:

```text
1594 pass
4 skip
0 fail
Ran 1598 tests across 133 files. [10.21s]
EXIT_STATUS: 0
```

The audit result is therefore pass: the added rollback regression test and fix have
no remaining blocking findings in Phase 1 gate evidence.

## Phase 2: Convex Schema + Single Source of Truth

- [~] Add `notificationPreferences` table to Convex schema (or extend `users`):
  - [~] Fields: `emailSprints`, `emailBudget`, `inAppAlerts`, `budgetThresholdPercent`.
- [~] Write `getNotificationPreferences` query with strong typing.
- [~] Write `updateNotificationPreference` mutation with validation.
- [~] Write unit tests for query + mutation.

### Phase 2 Red evidence (2026-06-10, MID role)

**Context.** `convex/notifications.ts` already exports a multi-field
`upsertNotificationPreferences` (lines 331-383) and a typed
`getNotificationPreferences` query (lines 318-329); the existing
`convex/notifications.preferences.test.ts` covers basic get/upsert behavior
and stays green. The plan's *new* contract — plan-mandated fields
(`emailSprints`, `emailBudget`, `inAppAlerts`, `budgetThresholdPercent`) and
a per-key `updateNotificationPreference` with boundary validation — is
**not** implemented in `convex/schema/operations.ts:55` nor in
`convex/notifications.ts`. Phase 2 Red drives that gap with live-behavior
tests, not contract-only stubs.

**Targeted Red command (bounded, file-scoped, no watch, no full suite):**

```
$ bun test ./convex/schema.notifications.test.ts ./convex/notifications.partialUpdate.test.ts
```

**Result:**

```
 4 pass
 8 fail
 12 expect() calls
Ran 12 tests across 2 files. [187.00ms]
```

**Failing tests (8, all for missing contract):**

1. `notificationPreferences schema (Phase 2 SoT) > exposes the plan-mandated
   preference fields (emailSprints, emailBudget, inAppAlerts, budgetThresholdPercent)`
   — current schema fields: `[userId, muteAll, inAppEnabled, webhookUrl,
   webhookEnabled, email, emailEnabled, typeFilters, updatedAt]`.
2-8. `updateNotificationPreference (Phase 2 SoT) > is exported from
   convex/notifications.ts` plus six behavior tests: rejects budget
   < 0, rejects budget > 100, accepts boundary 0, accepts boundary 100,
   performs partial key update preserving siblings, inserts new row on
   first call. The export is `undefined` because the mutation does not
   exist (the current `upsertNotificationPreferences` is a different
   signature — multi-field, no per-key boundary validation).

**Passing tests (4, characterizing existing correct behavior):**

- `notificationPreferences table` defined.
- `userId` field present.
- `updatedAt` field present.
- `by_user` index present.

These act as a guard rail so the Green phase does not regress on
the table shape while adding the new fields.

**No-regression check (full convex suite, post-Red):**

```
$ test -n "$(find ./convex -name '*.test.ts' -print -quit)" && \
    find ./convex -name '*.test.ts' -print0 | xargs -0 bun test
 1371 pass
 8 fail    ← exactly the 8 new Red tests above
Ran 1379 tests across 66 files. [1422.00ms]
```

**Notes & constraints surfaced for Green phase:**

- `convex-test` is **not installed** in this repo (not in `pivot/package.json`,
  not at the root, no `node_modules/convex-test`). The test-strategy §5
  "convex-test" gate is therefore not directly achievable. The Red tests
  use the in-house `createPrefMockCtx` pattern that is consistent with the
  existing `convex/notifications.preferences.test.ts` (see also
  `convex/notifications.batching.test.ts:7-103`). Per the prompt's
  fake-harness caveat ("prove the fake mode intercepts the exact command
  path or test the command string directly"), the new tests bypass any
  HTTP/route plumbing and exercise the `updateNotificationPreference`
  handler directly with a hand-rolled `db.query().withIndex().unique()`
  mock — the same pattern the existing `getNotificationPreferences` and
  `upsertNotificationPreferences` tests use. Green-phase should either
  install `convex-test` to satisfy the test-strategy's full plan, or
  document the in-house mock as the project's accepted production-
  preferences test harness (live-behavior is preserved because the mock
  implements the same `db.query`/`db.patch`/`db.insert` chain the handler
  will execute against the real Convex runtime).
- The schema test introspects the `defineTable` validator via
  `(schema as any).tables.notificationPreferences.validator.fields`. If
  Green adds new fields via `defineTable({...})`, the `fields` map will
  include them and the test will go green.
- The partial-update mock (`createPrefMockCtx`) intentionally mirrors the
  shape of the one in `convex/notifications.preferences.test.ts:17-64` but
  is kept in-file to avoid coupling. The strategy's "share
  `seedUserWithPreferences()` helper" guidance is deferred until the
  Green phase lands the actual `updateNotificationPreference` contract.

**What this Red commit does NOT do (Green/owner duties):**

- Add the four plan-mandated fields to the `notificationPreferences` table.
- Add the `updateNotificationPreference` mutation with `budgetThresholdPercent` range validator.
- Remove the legacy `muteAll` / `webhookUrl` / `email` / `typeFilters` fields
  (current behavior is preserved by the new test only for fields that
  exist; the new fields are asserted independently).
- Refactor `upsertNotificationPreferences` to delegate to the new
  per-key mutation (or leave it as-is and add `updateNotificationPreference`
  alongside).

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
