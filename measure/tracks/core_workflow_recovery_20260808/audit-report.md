# Fleet Commander live audit and full fix plan

**Audit date:** 2026-08-08  
**Repository:** `fleet-commander`  
**Imported project:** `reading-advantage-llm-benchmark`  
**Method:** Three parallel Luna live-browser sweeps using isolated `agent-browser` Chromium sessions, one static route-edge sweep, direct Pivot HTTP probes, Convex/Pivot server-log correlation, and source/graph inspection. `browser-harness` and Kimi WebBridge were not used. All browser actions were read-only.

## Executive conclusion

At the audit baseline, the shell was broad and visually coherent but the primary product workflow was not trustworthy. Portfolio rendered the imported project while Dashboard, Project View, and Sprint Planning failed at the first real data boundaries. Most secondary pages rendered empty shells, and mocked E2E coverage masked those live failures.

The narrow recovery track is now complete. The imported project renders end to end through Portfolio, Dashboard, Project View, Sprint Planning, and the honest pre-sprint Board state. The baseline findings below are retained as the durable audit record; the post-fix outcome and remaining work are recorded next.

## Recovery outcome

| Priority | Closeout status |
| --- | --- |
| Immediate / P0 | Complete. Slug identity, validator parity, imported project aggregation, visible 67-task planning backlog, explicit import behavior, error states, and live-stack acceptance are implemented. |
| Small P1 trust traps included in this track | Complete. Provider reads are registered, New Harness is reachable, Quality uses the imported project, Performance settles, and Templates fails explicitly. |
| Broader P1 trust recovery | Complete in [Secondary read trust recovery](../secondary_read_trust_recovery_20260808/plan.md#closeout-evidence--2026-08-08). History, Diagnose, Analytics, Templates, and wildcard routing now settle truthfully under real Chrome. |
| P2 architecture/test reduction | Still open. Duplicate/stale surfaces, graph-audit noise, React `act(...)` warnings, hoisted Vitest mocks, and the oversized frontend bundle remain explicit follow-up work. |

Factory activation is now being executed in [Bounded factory activation](../bounded_factory_activation_20260808/). Three Luna production-path audits narrowed the requirement to one project, one Pi-compatible agent, one atomic task assignment, and one explicit run with continuous mode disabled. They also found that the existing agent test fabricates success, the Project View run button targets an unregistered endpoint, Sprint Planning is non-atomic and would select the full backlog after agent creation, and the orchestrator mixes project slug/ID/name/path contracts. Those failures and their passing-but-weak tests are now explicit Red/Green requirements rather than deferred implementation surprises.

One real Chromium session tested the running Vite -> Pivot -> Convex stack without mocked routes. Portfolio showed one project; Project View showed six tracks and 67 tasks; Dashboard left its loading state; Sprint Planning rendered 67 task rows and disabled Start Sprint because there are no active agents; Board rendered an honest no-sprint state. The sweep also covered Providers, Performance, Templates retry, New Harness, Settings Quality, and Ops Quality. It recorded no page errors, no failing core responses, no automatic import POSTs, and no `demo-project` traffic.

Full verification finished green: Pivot 1,664/1,664, frontend 1,222/1,222, focused Convex recovery tests 70/70, frontend check, Pivot/frontend TypeScript, and the production build. Exact commands, route observations, weak-test repairs, and residual warnings are preserved in [plan.md](./plan.md#closeout-evidence-2026-08-08).

Four misleading test contracts were repaired rather than worked around: additive harness models no longer cause false failures; real `@live` E2E is forbidden from installing mock routes; router residue checks inspect executable syntax rather than prose comments; and the timeline test mounts its real parameterized route and asserts the current legacy state. The overly broad `brace-expansion` resolution that made ESLint crash was also removed.

The secondary recovery added the fail-closed browser coverage that the baseline lacked. System Chrome passed both live journeys with one worker and no route interception. The new journey covers Sprint/Task/Agent History, Diagnose, Analytics, Templates, and an unknown URL; it rejects failed Convex responses, page/console errors, permanent loading, and read-side mutations. Full closeout evidence and the weak-test repairs are preserved in the [secondary plan](../secondary_read_trust_recovery_20260808/plan.md#closeout-evidence--2026-08-08).

## Runtime baseline

- Vite frontend: `http://localhost:5173`
- Pivot API: `http://localhost:8081`
- Local Convex: `http://localhost:3210`
- Imported state: one project, six Measure tracks, 67 catalog tasks, no sprint
- Direct API sample: 47 GET endpoints checked; 41 returned 2xx, four returned 500, and two returned 404
- A 2xx response was not counted as functional when it returned an empty or disconnected data island

## Route findings

The classifications in this table describe the pre-fix audit baseline.

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

### Later / P2: reduce the architecture and activate the factory

1. Delete or archive unregistered/stale routes, duplicate adapters, and fixtures not needed by the canonical path.
2. Make Convex the only application-state source; keep Pivot for filesystem, process execution, orchestration actions, and boundary adaptation.
3. Replace fabricated dated zero-series metrics with explicit empty results plus UI empty states.
4. Reclassify the Playwright suite: mocked component journeys vs at least one mandatory live-stack journey.
5. Add route-registration and API-shape checks that fail when frontend fetches reference an unregistered endpoint.
6. Re-run build-graph dead-export analysis after scanner issue #2 is addressed; do not delete code solely from the current noisy audit.
7. Establish one proven factory execution path: configure one real harness/provider/agent, create a bounded sprint from the imported backlog, dispatch one task, persist its run/timeline/cost, and verify success or a truthful blocked failure in real Chrome.
8. Repair the passing-but-noisy frontend test infrastructure: move hoisted `vi.mock` calls to top level, eliminate unwrapped React updates on critical journeys, and fail CI on new console warnings.

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
| Graph update | Changed source files are reflected in `graph.db`; noisy audit limitations remain tracked in [GitHub issue #2](https://github.com/bodangren/fleet-commander/issues/2). |

## Existing debt relationship

- TD-260: mocked E2E baseline is not a live integration gate.
- TD-263: Convex unit-suite quarantine contains related validator failures but is broader than this track.
- TD-240 / [GitHub issue #2](https://github.com/bodangren/fleet-commander/issues/2): build-graph audit cannot yet cleanly distinguish unsupported nodes from actionable drift.
- Measure Doctor currently exits 1 on the pre-existing 516-line `qualityWorkflowRunner.ts`, stale orphan allowlist entries, and 56 graph-reported orphans. The secondary track proved five of those “orphans” are live production wiring, reinforcing issue #2; exact closeout output is summarized in the [secondary plan](../secondary_read_trust_recovery_20260808/plan.md#residual-debt-kept-visible).
