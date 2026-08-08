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
| Small P1 trust traps included in this track | Complete. Provider reads are registered, the obsolete custom-harness editor has been replaced by a read-only Pi catalog, Quality uses the imported project, Performance settles, and Templates fails explicitly. |
| Broader P1 trust recovery | Complete in [Secondary read trust recovery](../secondary_read_trust_recovery_20260808/plan.md#closeout-evidence--2026-08-08). History, Diagnose, Analytics, Templates, and wildcard routing now settle truthfully under real Chrome. |
| P2 architecture/test reduction | Still open. Duplicate/stale surfaces, graph-audit noise, React `act(...)` warnings, hoisted Vitest mocks, and the oversized frontend bundle remain explicit follow-up work. |

Factory activation implementation is ready in [Bounded factory activation](../bounded_factory_activation_20260808/), but its credentialed mutating acceptance has deliberately not run and the bounded track remains in progress. Three Luna production-path audits narrowed the requirement to one project, one Pi-compatible agent, one atomic task assignment, and one explicit run with continuous mode disabled. The resulting implementation replaces fabricated readiness with fail-closed Pi verification, resolves project identity once, registers a project-scoped production run, makes sprint creation atomic and one-task bounded, adds bounded run-receipt/restart contracts, and removes stale editable Convex/OpenCode harness surfaces.

The no-mock System Chrome `live-core.spec.ts` passed against the running Vite -> Pivot -> Convex stack both before recovery (54.0s) and after recovery (35.2s), including `/portfolio` -> imported project. Restart contract coverage passed 2/2; an actual SIGKILL took Pivot from PID 261372 to 261731 while Vite PID 261430 and Convex PID 261494 survived, and the API returned 200. The target repository stayed clean, `agents=[]`, `activeSprint=null`, and continuous mode remained `false`.

Current supported evidence is green for Pivot 1,710/1,710 and Pivot typecheck, focused Convex 40/40 (with direct-call warnings), deterministic offline boundary coverage 13/13, three consecutive Luna runs with zero unhandled WebSocket errors, and restart contract coverage 2/2. The definitive frontend Vitest passed 1,237 tests across 168 files with exit 0 and zero unhandled Convex, undici, or WebSocket errors; frontend check and production build also exited 0, with the existing 1.35162 MB chunk warning and nonfatal `vi.mock`/`vi.fn`/`act`/error-boundary warnings retained. The broad pre-existing Convex quarantine still has 146 failures under TD-263 and is not counted as green. Exact bounded-activation evidence is preserved in the [factory plan](../bounded_factory_activation_20260808/plan.md#verification-evidence--2026-08-08).

The weak-test repair also covered exact-task UI refresh, failure, and double-trigger behavior, plus run-receipt binding by `runId` and time window with bounded `timeout`/`maxTokens`. Unit tests that had been leaking into live Convex WebSockets were moved behind deterministic offline boundaries; focused coverage is 13/13 with zero unhandled errors across three consecutive Luna runs. Additive harness models no longer cause false failures; real `@live` E2E is forbidden from installing mock routes; router residue checks inspect executable syntax rather than prose comments; and the timeline test mounts its real parameterized route and asserts the current legacy state. The overly broad `brace-expansion` resolution that made ESLint crash was also removed.

A live harness race also exposed a false settled-empty render while `/api/harnesses` was still loading. The UI now distinguishes loading, error, and settled-empty states, and the strengthened E2E binds the success path to HTTP 200. Three focused runs passed 7/7 and the combined root run passed 9/9.

The secondary recovery added the fail-closed browser coverage that the baseline lacked. System Chrome passed both live journeys with one worker and no route interception. The new journey covers Sprint/Task/Agent History, Diagnose, Analytics, Templates, and an unknown URL; it rejects failed Convex responses, page/console errors, permanent loading, and read-side mutations. Full closeout evidence and the weak-test repairs are preserved in the [secondary plan](../secondary_read_trust_recovery_20260808/plan.md#closeout-evidence--2026-08-08).

The final real-Chrome `--grep @live --workers=1` aggregate after the exact fixes passed 2 journeys and skipped the bounded factory in 1.0 minute. `live-core` and `secondary-read` passed; bounded factory acceptance was skipped because `RUN_LIVE_FACTORY` was absent. The credentialed journey therefore remains intentionally unrun.

Final graph/Doctor evidence is complete for the performed checks, while the bounded track remains open for credentialed acceptance. Follow-up commits `c56b928d` and `4c8a8773` left final graph stats at 5,396 nodes, 7,604 edges, and 652 files; graph audit exits 1 with 529 `orphan_edges`, dominated by generated Convex `.d.ts`/dependency targets plus schema/field/route noise, consistent with issue #2. Final Measure Doctor passes as-any, boundary, stub-mutation, and status-vocabulary checks. Residual failures are the pre-existing `pivot/src/orchestrator/qualityWorkflowRunner.ts` line 516, pre-existing stale allowlist entries, and 63 reported orphan exports including `ProjectNextMission`, despite its production import by `ProjectViewPage`; `ProjectViewPage` was fixed from line 523 to 479, further confirming known graph false positives. Task 4.3 graph/Doctor items are checked, with residual failures preserved; its final evidence/registry item remains open.

The bounded track also repaired the more dangerous kind of weak browser test: negative-first assertions that could observe “no spinner” before React mounted and pass without waiting for application data. Core live checks now first require a positive settled-state anchor—an imported task, realtime-ready marker, honest board state, real provider response, templates empty state, or project-scoped quality response—and only then reject loading/error UI. Stale harness tests now enforce the smaller read-only Pi catalog instead of preserving dead edit behavior.

The remaining factory acceptance is intentionally opt-in, so bounded Task 4.2 remains unchecked. Task 4.3 graph synchronization and Doctor execution have run and their residual failures are preserved; only its final evidence/registry item remains open. Running the acceptance will create agent `factory-acceptance-luna`, assign exactly `Write schema validation tests for FrontendTask type`, invoke Pi with configured OpenAI Codex credentials, and may modify/commit the imported repository. Until explicit approval is given, live state remains `agents=[]`, `activeSprint=null`, no dispatched tasks, continuous mode `false`, and the target repository clean.

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
- Measure Doctor’s final observed run passes as-any, boundary, stub-mutation, and status-vocabulary checks, then exits 1 on the pre-existing 516-line `qualityWorkflowRunner.ts`, pre-existing stale allowlist entries, and 63 graph-reported orphans, including known false positives such as production-imported `ProjectNextMission`. The secondary track proved five of those “orphans” are live production wiring, reinforcing issue #2; the residual failures are preserved in the bounded plan above. Exact prior closeout output is summarized in the [secondary plan](../secondary_read_trust_recovery_20260808/plan.md#residual-debt-kept-visible).
