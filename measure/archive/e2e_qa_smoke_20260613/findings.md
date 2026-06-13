# Findings — E2E QA/QC Smoke Test

> Generated: 2026-06-13 | Combined surface + deep workflow testing

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 3 |
| Medium | 2 |
| **Total** | **7** |

---

## Q-FIND-001: Missing Convex function `history:listAgentHistory` (High)

- **Route:** `/history/agents`
- **Actual:** Convex error: `Could not find public function for 'history:listAgentHistory'`
- **Repro:** Navigate to `/history/agents`, check server logs

## Q-FIND-002: Deep link to non-existent project shows "Load error" (High)

- **Route:** `/project/:id` (invalid ID)
- **Actual:** "Load error - internal_server" instead of redirect
- **Repro:** Navigate to `/project/non-existent-id-12345`

## Q-FIND-003: `/settings` redirects to `/` instead of `/settings/app` (Medium)

- **Route:** `/settings`
- **Actual:** Redirects to `/` (root)
- **Repro:** Navigate to `/settings`

## Q-FIND-004: "New Project" header button navigates to Settings (Critical)

- **Route:** Header button (all pages)
- **Actual:** Navigates to `/settings` instead of project creation
- **Repro:** Click "New Project" in top-right header

## Q-FIND-005: `/harnesses` redirects to Settings/Profile (Critical)

- **Route:** `/harnesses`
- **Actual:** Shows Settings/Profile page instead of Harnesses
- **Repro:** Navigate to `/harnesses`

## Q-FIND-006: `/history/tasks` redirects to Settings/Profile (High)

- **Route:** `/history/tasks`
- **Actual:** Shows Settings/Profile page instead of Tasks History
- **Repro:** Navigate to `/history/tasks`

## Q-FIND-007: Agent saves without provider/model (Medium)

- **Route:** Add Agent form
- **Actual:** Saves with warning toast, no visible error
- **Repro:** Create agent without selecting provider, click Save

---

## Screenshots

See `screenshots/deep-test/` for all workflow screenshots.
See `screenshots/INDEX.md` for the full route coverage screenshots.
