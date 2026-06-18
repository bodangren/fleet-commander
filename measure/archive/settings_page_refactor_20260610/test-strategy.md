# Test Strategy: Settings Page Refactor and Notification Preferences

Tech Lead strategy for `settings_page_refactor_20260610`. Plan still marks every phase `[ ]`, but the working tree shows Phases 2–3 mostly built (Convex schema/funcs landed, sub-components exist, old `SettingsPage.tsx` already deleted). Strategy must therefore drive Phase 1 characterization *retroactively*, harden Phases 2–3, and complete Phases 4–5.

## 1. Testing Pyramid per Phase

| Phase | Unit (Vitest) | Component (Vitest + RTL) | Integration / Contract | E2E |
|---|---|---|---|---|
| 1 Characterization | — | 3 RTL tests vs. current `NotificationSettingsSection` | — | — |
| 2 Convex SoT | schema validator + arg validators | — | `convex-test` round-trip query↔mutation | — |
| 3 Sub-components | hook reducers / mappers | RTL per section + `SettingsLayout` routing | — | — |
| 4 Delete + Wire | — | `AppLayout` sidebar link, `App.tsx` route table | doctor.sh orphan + god-file | manual smoke |
| 5 Verification | full pivot suite | full frontend suite | doctor.sh `all` | — |

Heavy weighting on unit + component; only one Convex integration class; no Playwright additions (Non-Goal: visuals).

## 2. Shared Fixtures & Mocks

- `frontend/src/__fixtures__/notificationPreferences.ts` (NEW) — canonical `NotificationPreferences` object (all four flags + `budgetThresholdPercent`). Used by Phase 1, 3 component tests, and any future settings tests.
- Reuse `frontend/src/__fixtures__/insightsFixtures.ts` style (factory fn + partial overrides).
- Mock Convex via existing `vi.mock('convex/react', …)` pattern already in `NotificationSettingsSection.test.tsx`; expose `useQuery`/`useMutation` doubles with a `mutationResolver` knob to simulate success / rejection for rollback tests.
- Convex server tests: use `convex-test` harness consistent with `convex/notifications.preferences.test.ts`; share `seedUserWithPreferences()` helper in `convex/__fixtures__/foundation.ts` (extend existing file, do not fork).
- Pivot route tests already mock `ConvexHttpClient` via `bun:test` `mock()` — do not introduce a second mocking style.

## 3. Cross-Phase Edge Cases & Dependencies

- **Query → mutation race (the core bug):** test must assert: (a) initial render mirrors query; (b) click optimistically flips UI; (c) mutation rejection rolls UI back to query value, not stale local copy. Phase 1 captures current behavior; Phase 3 keeps it green.
- **Empty preferences row:** `getNotificationPreferences` returns `null` on first login — UI must show defaults, mutation must insert (covered in `convex/notifications.preferences.test.ts`).
- **`budgetThresholdPercent` boundary:** 0, 100, and out-of-range — Convex `updateNotificationPreference` validator.
- **Route guards:** `/settings` redirects to `/settings/app`; deep links to `/settings/notifications` work on cold load.
- **Depends on `typed_convex_boundary_20260605`:** consume the typed Convex client; do not weaken with `as any` (doctor.sh `as-any` guard catches this).
- **Phase ordering trap:** Phase 4 (delete + sidebar wiring) is mostly *already done* in tree but unverified by Phase 1 baseline — characterization tests MUST land before Phase 4 retro-tick.

## 4. Architecture Guardrails

- No component > 250 lines (spec AC #1); enforced by `doctor.sh god-file` (threshold 500 globally, but track owners self-audit ≤250 for settings sections).
- No `as any` in `frontend/src/pages/settings/**` — `doctor.sh as-any`.
- Single source of truth: only `convex/notifications.ts` may read/write the `notificationPreferences` table. Add a one-line ESLint comment ban on direct `db.query('notificationPreferences')` outside that file (or rely on review).
- All exported settings symbols must have non-test inbound edges in `graph.db` after Phase 4 — `doctor.sh orphans`.
- No new pivot route for preferences — preferences flow Convex-direct (avoid double-write).

## 5. Per-Phase Test Approach Notes

- **Phase 1 (Red→Pass against existing code):** 3 RTL tests against current `NotificationSettingsSection.tsx`. Expect pass on first run (characterization, not failure-driven Red). If they fail, the race bug is still live and Phase 2/3 work was incomplete — escalate.
- **Phase 2:** Extend `convex/notifications.preferences.test.ts` if any field/validator missing; add a `convex-test` case for partial update merge (PATCH-like). Schema shape verified in `convex/schema.test.ts` (already present infra).
- **Phase 3:** Each section component gets its own `*.test.tsx` next to it. `SettingsLayout` test renders an `<Outlet/>` mock and asserts sidebar nav links exist + active state.
- **Phase 4:** Add `App.routes.test.tsx` (if absent) asserting `/settings`, `/settings/app`, `/settings/notifications` resolve. Run `doctor.sh orphans` and `doctor.sh god-file` as gates.
- **Phase 5:** Aggregate gates only; no new tests.

## 6. build-graph Findings That Shaped Strategy

- `build-graph stats`: 626 files, 5006 nodes — graph fresh enough for callers analysis but stale on the deleted `SettingsPage.tsx` path (still appears as a node). Plan a `build-graph update ./graph.db frontend/src/pages/settings/*.tsx frontend/src/App.tsx convex/notifications.ts convex/schema/operations.ts` at end of Phase 4 to clear stale `SettingsPage` references; Phase 5 verifies via `build-graph audit ./graph.db`.
- `build-graph search "Settings"`: surfaced unrelated `ModelRouterSettings`, `useSettingsData` (pivot API hook), and `registerSettingsRoutes` (`pivot/src/routes/settings.ts`) — these are **app config**, not preferences. Strategy keeps them out of scope; only preferences flow Convex-direct.
- `build-graph search "notification"`: confirmed `convex/notifications.ts` already exports `getNotificationPreferences` (line 318) and that pivot has its own `notifications.ts` route + tests — preferences must NOT leak into the pivot route layer.
- Ambiguous-name nodes for `SettingsPage` confirm graph staleness; treat all caller queries with `--json` and disambiguate by `file_path` before acting.

## 7. Live-Proof Plan (Targeted Red → Green/Closeout)

Every phase needs a **bounded targeted command** (not the full suite) so a missing file or skipped test does not silently fall through.

| Phase | Targeted Red command | Green / closeout gate |
|---|---|---|
| 1 | `bun --cwd frontend test src/pages/settings/NotificationSettingsSection.test.tsx -t "characterization"` — fails until 3 named tests exist & pass | Same command exits 0; tests appear in `vitest run` output by exact name. **Live behavior** (not artifact). |
| 2 | `bun --cwd pivot test convex/notifications.preferences.test.ts -t "partial update"` (new case) + `bun --cwd pivot test convex/schema.test.ts -t "notificationPreferences"` | Both pass; `convex-test` exercises real query/mutation against in-memory Convex — **live behavior**, not contract-only. |
| 3 | `bun --cwd frontend test src/pages/settings/` (folder-scoped) — must list ≥1 test per section file | Folder run green; component count matches section count (command-construction proof: `vitest --reporter=json` shows N test files). |
| 4 | `bun --cwd frontend test src/App.routes.test.tsx` + `bash measure/doctor.sh orphans` + `bash measure/doctor.sh god-file` | All exit 0; doctor checks are **artifact/structural contract tests** (not runtime). Pair with `bun --cwd frontend test src/layout/AppLayout` for a **live** sidebar render assertion so doctor alone cannot rubber-stamp. |
| 5 | `npm run pivot:test` + `bun --cwd frontend test` + `bash measure/doctor.sh all` | All green; coverage ≥80% on `frontend/src/pages/settings/**` and `convex/notifications.ts` preferences path (use `bun --cwd frontend test --coverage`). **Live behavior** end-to-end. |

### Artifact-vs-Live distinction

- **Artifact / contract checks:** `doctor.sh god-file`, `doctor.sh orphans`, `doctor.sh as-any`, `build-graph audit`, route-table snapshot. These prove *shape*, not runtime — never the sole gate for a phase.
- **Live behavior checks:** all `vitest` + `bun:test` + `convex-test` runs above. Every phase has ≥1 live check.
- **Fake harnesses:** the existing pivot route test uses `mock(async () => [])` for `ConvexHttpClient`. This is acceptable for **router plumbing only**. Phase 2 production preferences gate uses real `convex-test`, not the pivot mock, so the fake cannot fall through. No new fake harnesses are introduced for preferences.

### Intentionally-red / pending tests

- No `*.test.*` file is intentionally red. Plan task `[~] Phase 1 characterization` owns the only currently-missing-but-aggregate-discoverable tests; until that task moves to `[x]`, aggregate runs (`npm run pivot:test`, `bun --cwd frontend test`) will surface them as either *not-yet-written* (no file, no failure) or *failing* (file present, behavior wrong). Strategy: create the file only inside the Phase 1 commit so aggregate suites stay green between phases. Do **not** add `.skip` placeholders — they hide drift.