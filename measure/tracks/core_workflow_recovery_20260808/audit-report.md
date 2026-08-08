# Fleet Commander live audit and full fix plan

**Audit date:** 2026-08-08  
**Repository:** `fleet-commander`  
**Imported project:** `reading-advantage-llm-benchmark`  
**Method:** Three parallel Luna live-browser sweeps using isolated `agent-browser` Chromium sessions, one static route-edge sweep, direct Pivot HTTP probes, Convex/Pivot server-log correlation, and source/graph inspection. `browser-harness` and Kimi WebBridge were not used. All browser actions were read-only.

## Executive conclusion

The shell is broad and visually coherent, but the primary product workflow is not trustworthy. Portfolio renders the imported project, while Dashboard, Project View, and Sprint Planning fail at the first real data boundaries. Most secondary pages render empty shells, and mocked E2E coverage masks those live failures.

The recovery strategy is deliberately narrow: restore one vertical slice from import/portfolio through project work, planning, and board; make errors explicit; then hide or defer surfaces that do not have a live contract.

## Runtime baseline

- Vite frontend: `http://localhost:5173`
- Pivot API: `http://localhost:8081`
- Local Convex: `http://localhost:3210`
- Imported state: one project, six Measure tracks, 67 catalog tasks, no sprint
- Direct API sample: 47 GET endpoints checked; 41 returned 2xx, four returned 500, and two returned 404
- A 2xx response was not counted as functional when it returned an empty or disconnected data island

## Route findings

| Route/area | Classification | Live evidence |
| --- | --- | --- |
| `/` Dashboard | P0 Broken | Permanent `Loading dashboard...`; Convex rejects returned task field `dependencies` because the return validator omits it. |
| `/portfolio` | Partial | Imported project is visible, but navigation triggers duplicate `POST /api/projects/scan-and-import` calls. |
| `/project/reading-advantage-llm-benchmark` | P0 Broken | `Load error` / `internal_server`; project GET receives a slug while Convex expects `v.id('projects')`; `next-task` returns 404. |
| `/board` | Misleading | Project selector works, but no task board is reachable without a sprint; the imported backlog is not presented here. |
| `/sprint-planning` | P0 Broken | UI reports `Backlog Tasks 67` while rendering `No backlog tasks available`; recommendation GET returns 500 due to validator drift. |
| `/blockers` | Working empty | Filters and empty-state content render. |
| `/alerts` | Working empty | Filters and empty-state content render. |
| `/notifications` | Working empty | Shows zero unread and an honest empty state. |
| `/agents` | Working empty | Agent roster shell and controls render; live agents/workload/harness reads return 200. |
| `/agents/leaderboard` | Working empty | Filters and time-window controls render without results. |
| `/agent-templates` | Working empty | List/new/seed controls render; REST list returns 200 and empty. |
| `/providers` | Broken | Shell renders, but provider health and fallback GETs return 404. `pivot/src/routes/providers.ts` exists and has tests but is not registered in `server.ts`. |
| `/templates` | Broken beneath shell | Heading and controls render, but Convex reports no public `listProjectTemplatesHandler`. |
| `/analytics` | Partial | Most charts render zero-series data; Agent Utilization remains an unlabeled infinite spinner. |
| `/performance` | Partial | Trends/empty panels render; Phase Breakdown spins forever because returned `sampleCount` is absent from its validator. |
| `/costs` | Working empty | Honest `No cost data` state. |
| `/ops` | Working | Queue, fleet, timeline, governance, and global-runs tabs render. |
| `/ops/monitor` | Working | Shows Ready, 67 waiting tasks, and zero active/blocked/completed. |
| `/ops/diagnose` | Partial | Drift summary renders; audit events remain on `Loading audit events...`. |
| `/ops/reconcile` | Working empty | Zero proposals; reconciliation GET returns 200. |
| `/history/sprints` | Broken | Times out as backend unavailable. |
| `/history/agents` | Working empty | Honest empty state. |
| `/history/tasks` | Broken | Times out as backend unavailable. |
| `/retrospectives` | Working empty | Honest empty state; mutation controls were not used. |
| `/settings/*` | Partial | Standard settings render. Quality uses hardcoded `demo-project`, not the selected imported project. |
| Harness creation | Broken edge | `Add Custom Harness` links to `/harnesses/new`; router only registers `/harnesses/:name/edit`. |
| Unknown routes | Misleading | Wildcard silently redirects to `/`, where the Dashboard spinner hides the bad URL. |

## Failing HTTP contracts

| Endpoint | Status | Root cause |
| --- | ---: | --- |
| `GET /api/projects/reading-advantage-llm-benchmark` | 500 | Slug passed to a Convex-ID validator. |
| `GET /api/dashboard?projectId=<id>` | 500 | Returned task contains `dependencies` and other catalog fields omitted from validator. |
| `GET /api/planning/recommendation?projectId=<id>` | 500 | Backlog task return validator omits `dependencies` and catalog metadata. |
| `GET /api/performance/phase-breakdown` | 500 | Returned phase object includes `sampleCount`; validator omits it. |
| `GET /api/providers/health` | 404 | Provider route module is not registered. |
| `GET /api/providers/fallbacks` | 404 | Provider route module is not registered. |

## Misleading successful contracts

- Project-by-ID returns metadata only, without the six tracks or 67 tasks required by Project View.
- `/api/stats/overview` reports zero projects and zero tasks while Portfolio and Monitor see the imported project/tasks.
- Analytics and performance trend endpoints synthesize dated zero rows, which look like real observations despite having no samples.
- Several pages interpret a failed or absent query as perpetual loading instead of an error.

## Structural causes

1. **Parallel data paths:** frontend slices mix direct Convex queries, Pivot REST proxies, and mock adapters. Identity and response-shape rules differ between paths.
2. **Read-side mutation:** `useFleetData` runs scan/import whenever the layout mounts, so ordinary navigation mutates backend state and floods logs.
3. **Contract drift:** Convex return validators no longer describe imported catalog documents.
4. **Disconnected task models:** Fleet catalog imports see 67 tasks, while older project/statistics/board paths read different tables or shapes.
5. **Mock-only confidence:** all 27 Playwright specifications use `seedScenario`, `setupMockApp`, or direct route interception. They do not prove Vite -> Pivot -> Convex behavior.
6. **Wiring/dead-code failures:** provider route code and tests exist but are unreachable; project-template and history surfaces reference missing or stale public functions.
7. **Excess surface:** approximately 65,000 non-test TypeScript lines, 39 pages, 115 components, 31 Pivot route modules, and 114 Convex modules support an MVP whose core two clicks fail.

## Full fix plan

### Immediate / P0: restore one usable vertical slice

1. Adopt one project identity rule: slug at user-facing URLs, resolved once to a typed Convex ID at the HTTP/query boundary.
2. Repair Dashboard and Sprint Planning return validators and add regression tests using imported task shapes.
3. Return the imported tracks/tasks from Project View and make Project, Planning, Board, Monitor, and stats consume the same catalog.
4. Remove automatic scan/import from layout reads. Keep import and sync behind explicit controls.
5. Replace permanent core spinners with visible error/retry states.
6. Add a non-mocked local-stack smoke for Portfolio -> Dashboard/Project -> Planning -> Board.

### Next / P1: remove immediate trust traps

1. Repair the performance phase validator and label zero-sample charts as `No data`.
2. Register provider routes if Providers remains in navigation; otherwise hide the page.
3. Wire or explicitly disable Project Templates.
4. Fix the Harness creation URL.
5. Remove `demo-project` constants from Quality routes and require a selected project.
6. Fix Diagnose, Sprint History, and Task History loading/error behavior or remove their navigation entries.
7. Make wildcard routing show a 404 with the attempted path rather than silently redirecting.

### Later / P2: reduce the architecture

1. Delete or archive unregistered/stale routes, duplicate adapters, and fixtures not needed by the canonical path.
2. Make Convex the only application-state source; keep Pivot for filesystem, process execution, orchestration actions, and boundary adaptation.
3. Replace fabricated dated zero-series metrics with explicit empty results plus UI empty states.
4. Reclassify the Playwright suite: mocked component journeys vs at least one mandatory live-stack journey.
5. Add route-registration and API-shape checks that fail when frontend fetches reference an unregistered endpoint.
6. Re-run build-graph dead-export analysis after scanner issue #2 is addressed; do not delete code solely from the current noisy audit.

## Scope decision for this track

This track implements the Immediate/P0 list and the small P1 wiring fixes that are safe and local. Larger analytics/history redesign is deferred. Broken optional surfaces should be hidden or made explicitly unavailable rather than consuming recovery time.

## Verification matrix

| Proof | Required outcome |
| --- | --- |
| Focused Convex tests | Previously failing return shapes pass validators. |
| Pivot route tests | Slug/ID project lookup and provider registration are real. |
| Frontend tests | No automatic import; project/planning errors leave loading states. |
| Live API probes | Six audited 500/404 endpoints return truthful 2xx or explicit supported errors. |
| Live browser smoke | Portfolio, Dashboard, Project, Planning, and Board render without permanent loading/load errors. |
| Graph update | Changed source files are reflected in `graph.db`; noisy audit limitations remain tracked in GitHub issue #2. |

## Existing debt relationship

- TD-260: mocked E2E baseline is not a live integration gate.
- TD-263: Convex unit-suite quarantine contains related validator failures but is broader than this track.
- TD-240 / GitHub issue #2: build-graph audit cannot yet cleanly distinguish unsupported nodes from actionable drift.

