# Specification — E2E Audit Remediation

## Overview

Full remediation of all 29 findings from the 2026-06-03 E2E audit (`measure/reports/2026-06-03-e2e-audit.md`). The audit walked all 29 routes + dynamic deep-links against the live dev stack and found 10 P0 app-breaking bugs, 8 P1 workflow-blocking issues, and 11 P2 polish items. Approximately 40% of P0 findings trace to 4 missing Convex functions in the deployed manifest.

## Functional Requirements

### P0 — App-breaking

**FR-1** Deploy missing Convex functions.
Push `portfolio:getPortfolioHandler`, `projects:listProjects`, `governanceEvents:getGovernanceEvents`, and `agentTemplates:listTemplatesHandler` (+ `seedDefaultTemplatesHandler`, `createTemplateHandler`) to the deployed Convex manifest by running `npx convex dev --once` after upgrading the local backend binary.

**FR-2** Fix home page `/` permanent "Loading…" state.
`PortfolioRedirect` must handle the error and empty-data branches from `usePortfolioData`, not only the `undefined` (loading) case. After FR-1 resolves the missing function, add error → redirect-with-fallback and empty → redirect-to-create-project.

**FR-3** Fix sidebar `Task Timeline` dead link.
`AppLayout.tsx:59` links to `/tasks/timeline` but the route is `/tasks/:taskId/timeline`. Either add a `/tasks/timeline` index route (list of recent tasks with links to individual timelines) or remove the sidebar item and provide an alternative entry point.

**FR-4** Wire Agent Editor "Save Agent" button.
`AgentEditorPage.tsx` Save button must fire a mutation to create or update the agent in Convex. Currently zero network requests on click.

**FR-5** Fix Agent Editor "Clone" infinite re-render loop.
Clone handler in `AgentEditorPage.tsx` causes an infinite render loop (JS evaluations time out >60 s). Fix `useEffect` dependency array or state-update cycle.

**FR-6** Wire top-bar "New Project" button.
The "New Project" button visible on every page must open a project-creation modal or navigate to a create-project page. Currently does nothing.

**FR-7** Fix notification preferences not persisting.
`POST /api/notifications/preferences` returns 200 but `GET` returns 404. The backend storage path for notification preferences is missing or misrouted.

**FR-8** Add error/empty states to 3 History pages.
`/history/sprints`, `/history/agents`, `/history/tasks` must show an error state on failure and an empty state on `[]`, not hang on "Loading… forever".

**FR-9** Fix `/pipelines` error-only rendering.
`/pipelines` must show a page heading, empty state, and retry affordance — not just a bare "Failed to fetch executions" card.

**FR-10** Handle invalid task IDs on `/tasks/:taskId/timeline`.
`TaskTimelinePage.tsx` must show a not-found state when the task ID doesn't exist, not hang silently on "Loading timeline…".

### P1 — Confusing or workflow-blocking

**FR-11** Unblock Sprint Planning workflow.
Add a CTA or affordance to create/add tasks to the backlog so the "Start Sprint" button can eventually be enabled. Currently the page advertises a flow it cannot deliver.

**FR-12** Add Provider management affordance.
`/providers` needs a "Sync from harness" or "Add provider" button so the Provider dropdown on Agent Editor is populated.

**FR-13** Fix "Test Agent" result display.
Backend returns `200 {ok:true, message:"Test execution stubbed for <name>"}` but the UI renders `undefined ms · FAILED · No output`. Parse the response correctly and show success.

**FR-14** Add CTA to `/board` empty state.
"No sprints" empty state must include a link or button to create a sprint or navigate to Sprint Planning.

**FR-15** Add save-success feedback.
Sync, Save Settings, Save Preferences, Save Agent — all must produce a toast/banner confirming success or failure.

**FR-16** Fix `/agent-templates` 500 errors.
"Seed Defaults" and "Save Template" return 500 because `agentTemplates:*Handler` functions are missing from the Convex manifest (resolved by FR-1). UI must also show an error toast on failure.

**FR-17** Fix `/ops/optimize` stuck "Loading…" state.
Add error and empty state branches — same pattern as FR-8.

**FR-18** Add sidebar entries for 5 orphan routes.
`/retrospectives`, `/notifications`, `/alerts`, `/ops/reconcile`, `/ops/simulate` are reachable only by direct URL. Add sidebar items or group them under existing sections.

### P2 — Polish & topbar labelling

**FR-19** Fix topbar title on `/costs`.
`viewTitle()` in `AppLayout.tsx` must return "Costs" for the `/costs` route, not "Dashboard".

**FR-20** Fix topbar title on `/ops/reconcile` and `/ops/simulate`.
`viewTitle()` must handle sub-routes under `/ops/*`.

**FR-21** Rename confusing card title on `/ops/diagnose`.
First card is titled "Reconcile" — rename to "Diagnose" or "Drift Detection" to avoid confusion with the Reconciliation panel.

**FR-22** Guard epoch date on project detail.
`/project/<id>` shows "LAST PULSE Jan 1, 1970, 8:00 AM" when `lastPulseAt` is null/0. Formatter must handle falsy values.

**FR-23** Show friendly not-found page for invalid project IDs.
`/project/<bad-id>` must show a "Project not found" page instead of the raw Convex error `"Load error / internal_server"`.

**FR-24** Add accessible name to sidebar refresh icon.
`button name=""` in snapshot — add `aria-label="Refresh"` or visible text.

**FR-25** Visually distinguish disabled `Start Sprint` button.
Disabled state must be visually distinct from enabled primary button (opacity, color, or icon change — not just `cursor`).

**FR-26** Fix `type="submit"` on Agent Editor header buttons.
Sync, New Project, Clone, Delete, Test, Save, Back — all are `type="submit"`. Change non-save buttons to `type="button"`.

**FR-27** Add "unsaved changes" guard on Agent Editor.
Cancel/Back from Agent Editor must warn about discarding edits if the form is dirty.

**FR-28** Fix simultaneous error toast + empty state on `/agent-templates`.
Page shows red error banner AND empty state together. Show one or the other — error takes precedence.

**FR-29** Add filters or context to `/blockers` empty state.
Empty state should link to where blockers come from or explain the concept, not just show "0 tasks need intervention".

## Non-Functional Requirements

- All fixes must pass `npm run lint` and `bun --cwd frontend check`.
- New/modified components should have unit tests where the pattern is established (Vitest + React Testing Library).
- No regressions: existing passing tests must continue to pass.

## Acceptance Criteria

- AC-1: All 29 findings are resolved (each maps to an FR above).
- AC-2: `npx convex dev --once` succeeds and the 4 missing functions are queryable.
- AC-3: No route hangs on "Loading…" indefinitely — every loading state has error and empty branches.
- AC-4: All sidebar links resolve to valid routes; all orphan routes have sidebar entries.
- AC-5: Agent Editor Save, Clone, and Test buttons work correctly.
- AC-6: All topbar titles match the active route.
- AC-7: `npm run lint` and `bun --cwd frontend check` pass.

## Out of Scope

- Backend refactoring of Convex schema or pivot routes (separate tracks).
- Performance optimization of Convex queries (see tech-debt.md).
- New features not identified in the audit.
