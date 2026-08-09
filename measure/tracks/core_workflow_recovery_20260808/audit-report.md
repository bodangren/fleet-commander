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

## Subsequent recovery closeouts — 2026-08-09

- [Convex Test Trust Recovery (TD-263)](../convex_test_trust_recovery_20260809/plan.md)
  replaced direct decorated-handler mocks with registered runtime contracts, repaired the defects those
  tests exposed, and made clean-checkout acceptance authoritative. Its final runtime surface passed
  21 files / 105 tests; the remaining pure/schema Convex suite passed 35 files / 957 tests.
- [Notification Authorization Recovery (TD-264)](../notification_authorization_recovery_20260809/plan.md)
  chose deletion over fake authorization. The public notification API, arbitrary webhook, fake email,
  Pivot routes, production emitters, frontend product, 23 warning-producing wrapper tests, and stale
  Doctor allowlist entries are gone. Alerts, task state/history, recovery evidence, and execution logs
  remain the supported operator truth. The schema tables are temporarily non-addressable pending the
  TD-265 retention/export decision.
- TD-264 clean-checkout evidence is green: Convex runtime 21/105, remaining Convex 31/922,
  Pivot 148/1,709, frontend 172/1,252, all typechecks/check/build, and real system Chrome 3/3.
  The clean run also found and fixed a genuine suite-order leak where Bun module mocks made three
  orchestrator parity tests return `no_tasks` only in the full suite.

## Remaining implementation sequence

The following sequence is the current complete fix plan. Tracks are created and completed one at a
time so deferred debt does not masquerade as simultaneous progress:

1. **TD-265 — historical notification data disposition.** Inspect the actual local/deployment data
   boundary, export or document retention if rows exist, then remove the two non-addressable schema
   tables and notification-only validator vocabulary when safe. Do not add a replacement product.
2. **Fleet bootstrap readiness and latency.** Decouple project identity/selection from unrelated
   agents, harnesses, settings, and dashboard requests. A project selector must become usable from
   the project response alone; one slow optional request must not block every page. Set real-browser
   response/readiness budgets from observed cold loads (currently up to 13.1 seconds).
3. **Frontend test-signal cleanup.** Repair every remaining React `act(...)` warning and the
   Kanban duplicate-key warning at their real async/list boundaries; add a gate that rejects new
   unclassified console warnings. Do not silence `console.error` globally or replace behavior with
   mocks.
4. **Frontend delivery size.** Split route-level and heavy optional feature chunks; keep the core
   Portfolio/Dashboard/Project/Planning/Board path eagerly reliable while removing the existing
   >500 kB main-bundle advisory.
5. **Canonical application state.** Continue converging UI state reads on Convex, keeping Pivot for
   filesystem/process/orchestration boundaries. Remove duplicate adapters and replace fabricated
   dated zero-series with explicit no-observation results and truthful empty states.
6. **Dead/stale product sweep (TD-247 relationship).** Remove unused employees/runs/scheduler and
   archived pipeline/simulation/experiment surfaces only after source/caller and real-route proof;
   do not delete from the noisy graph audit alone.
7. **Graph/Doctor trust.** Fix or replace the graph auditor's generated declaration/CSS/schema/route
   blind spots tracked in [GitHub issue #2](https://github.com/bodangren/fleet-commander/issues/2),
   then reconcile the remaining stale allowlist entries, 65 reported orphans, and the 516-line
   `qualityWorkflowRunner.ts` on reliable evidence.
8. **Bounded software-factory acceptance.** After explicit user approval, run exactly one
   credentialed, project-scoped Pi task on a local no-push branch with continuous mode disabled and
   a 600-second/16,000-token ceiling. Verify its assignment, run receipt, timeline, cost, Git state,
   restart recovery, and truthful terminal UI in real Chrome. Until approval, this final mutation
   remains intentionally unrun and cannot be claimed complete.

Factory activation implementation is ready in [Bounded factory activation](../bounded_factory_activation_20260808/), but its credentialed mutating acceptance has deliberately not run and the bounded track remains in progress. Three Luna production-path audits narrowed the requirement to one project, one Pi-compatible agent, one atomic task assignment, and one explicit run with continuous mode disabled. The resulting implementation replaces fabricated readiness with fail-closed Pi verification, resolves project identity once, registers a project-scoped production run, makes sprint creation atomic and one-task bounded, adds bounded run-receipt/restart contracts, removes stale editable Convex/OpenCode harness surfaces, and now forces manual execution onto a local no-push task branch with zero retries, an explicit timeout/token ceiling, and pre/post Git evidence.

The no-mock System Chrome `live-core.spec.ts` passed against the running Vite -> Pivot -> Convex stack both before recovery (54.0s) and after recovery (35.2s), including `/portfolio` -> imported project. Restart contract coverage passed 2/2; an actual SIGKILL took Pivot from PID 261372 to 261731 while Vite PID 261430 and Convex PID 261494 survived, and the API returned 200. The target repository stayed clean, `agents=[]`, `activeSprint=null`, and continuous mode remained `false`.

Current supported evidence is green for Pivot 1,717/1,717 and Pivot typecheck, focused Convex contracts (with direct-call warnings), deterministic offline boundary coverage 13/13, three consecutive Luna runs with zero unhandled WebSocket errors, and restart contract coverage 2/2. The definitive frontend Vitest passed 1,237 tests across 168 files with exit 0 and zero unhandled Convex, undici, or WebSocket errors; frontend check and production build also exited 0, with the existing 1.35162 MB chunk warning and nonfatal `vi.mock`/`vi.fn`/`act`/error-boundary warnings retained. The authoritative Convex full-gate rerun remains red: 74 files, 1,438 tests, 1,299 passed, 139 failed, 0 errors/unhandled, 2,866 assertions, and 629 direct-call warnings. Three test-harness repairs are reflected: `qualityProfiles` global `process.env` contamination, the extra brace in `schema.foundation`, and omitted `pipelineRuns` args (with a default-limit regression). Their focused verification passes 63/63 and Pivot typecheck passes. The graph has no nodes for these test files, consistent with TD-2's known coverage gap. Residual failures are confined to 16 files and belong to the next scoped TD-263 remediation track; the Convex gate is not green and the bounded factory track remains open. Exact bounded-activation evidence is preserved in the [factory plan](../bounded_factory_activation_20260808/plan.md#verification-evidence--2026-08-08).

The weak-test repair also covered exact-task UI refresh, failure, and double-trigger behavior, plus run-receipt binding by `runId` and time window with bounded `timeout`/`maxTokens`. Unit tests that had been leaking into live Convex WebSockets were moved behind deterministic offline boundaries; focused coverage is 13/13 with zero unhandled errors across three consecutive Luna runs. Additive harness models no longer cause false failures; real `@live` E2E is forbidden from installing mock routes; router residue checks inspect executable syntax rather than prose comments; and the timeline test mounts its real parameterized route and asserts the current legacy state. The overly broad `brace-expansion` resolution that made ESLint crash was also removed.

A live harness race also exposed a false settled-empty render while `/api/harnesses` was still loading. The UI now distinguishes loading, error, and settled-empty states, and the strengthened E2E binds the success path to HTTP 200. Three focused runs passed 7/7 and the combined root run passed 9/9.

The secondary recovery added the fail-closed browser coverage that the baseline lacked. System Chrome passed both live journeys with one worker and no route interception. The new journey covers Sprint/Task/Agent History, Diagnose, Analytics, Templates, and an unknown URL; it rejects failed Convex responses, page/console errors, permanent loading, and read-side mutations. Full closeout evidence and the weak-test repairs are preserved in the [secondary plan](../secondary_read_trust_recovery_20260808/plan.md#closeout-evidence--2026-08-08).

The final real-Chrome `--grep @live --workers=1` aggregate after the safety hardening passed 3 journeys and skipped the bounded factory in 53.5 seconds. `live-core`, `secondary-read`, and the mutation-blocking factory-readiness preflight passed; bounded factory acceptance was skipped because `RUN_LIVE_FACTORY` was absent. The credentialed journey therefore remains intentionally unrun.

Final graph/Doctor evidence is complete for the performed checks, while the bounded track remains open for credentialed acceptance. Incremental hardening updates leave current graph stats at 5,432 nodes, 7,633 edges, and 655 files. The last completed graph audit reported 529 `orphan_edges`, dominated by generated Convex `.d.ts`/dependency targets plus schema/field/route noise; the post-hardening audit produced no output for more than 90 seconds and was terminated, consistent with the tooling-quality problem in issue #2. Final Measure Doctor passes as-any, boundary, stub-mutation, and status-vocabulary checks. Residual failures are the pre-existing `pivot/src/orchestrator/qualityWorkflowRunner.ts` line 516, pre-existing stale allowlist entries, and 63 reported orphan exports including `ProjectNextMission`, despite its production import by `ProjectViewPage`; `ProjectViewPage` was fixed from line 523 to 479, further confirming known graph false positives. Task 4.3 graph/Doctor items are checked, with residual failures preserved; its final evidence/registry item remains open.

The bounded track also repaired the more dangerous kind of weak browser test: negative-first assertions that could observe “no spinner” before React mounted and pass without waiting for application data. Core live checks now first require a positive settled-state anchor—an imported task, realtime-ready marker, honest board state, real provider response, templates empty state, or project-scoped quality response—and only then reject loading/error UI. Stale harness tests now enforce the smaller read-only Pi catalog instead of preserving dead edit behavior.

The remaining factory acceptance is intentionally opt-in, so bounded Task 4.2 remains in progress. Its nonmutating safety/evidence subtasks are complete; Task 4.3 graph synchronization and Doctor execution have run and their residual failures are preserved, leaving only the credentialed journey and final registry closeout. Running the acceptance will create agent `factory-acceptance-luna`, assign exactly `Write schema validation tests for FrontendTask type`, create a local `fc/task-*` branch, invoke Pi once with configured OpenAI Codex credentials under a 600-second/16,000-token ceiling, and may modify/commit the imported repository without pushing. Until explicit approval is given, live state remains `agents=[]`, `activeSprint=null`, no dispatched tasks, continuous mode `false`, and the target repository clean.

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

## Incremental recovery evidence — 2026-08-09

The following closeout addendum supersedes older counts where they differ and
keeps the bounded factory acceptance explicitly open. No track-registry
completion status is asserted because the credentialed create-agent,
create-sprint/task, and one-Pi-cycle journey still requires user approval.

### Production recovery boundaries

- Dashboard now has an explicit `/dashboard` route and uses the canonical
  `GET /api/dashboard` through a finite Pivot loading/error/retry path. Root
  remains Portfolio for multi-project navigation.
- Board and Sprint Planning use query-backed project scope; Board accepts an
  ID or slug, Planning exposes project selection, and the project adapter keeps
  the API slug with the Convex ID.
- Quality Settings and Ops Quality use one shared accessible explicit project
  selector, with no silent auto-selection for multiple projects.
- Sprint and Task History use explicit selectors and scoped read endpoints for
  Bun mode (`/api/history/projects/:projectId/sprints` and `/tasks`), while
  configured Convex mode remains direct. These reads settle with finite
  success/error states and do not mutate. Task History now offers only the
  backend's canonical statuses and no longer exposes invalid `todo`.
- The lightweight `/api/projects` adapter now tolerates omitted `tracks`
  (`totalSprints = 0`) and optional `path`, preserving project ID/slug.
- Pivot WAL tests use opt-in `FLEET_WAL_DIR` plus a PID-scoped Bun preload under
  `/tmp`; production retains `~/.measure-fleet/wal`. Weak tests were corrected,
  including moving nested Vitest mocks to top-level scope. The workspace typo
  reported during the run was a user typo, not a product defect.

### Verification snapshot

- Supervised restart kept Vite/Convex alive while Pivot restarted and returned
  `200` from the API.
- Default real Chrome `@live`: 3 passed, 1 credentialed journey skipped, in
  approximately 1.0 minute.
- Targeted forced-Bun real Chrome History journey: scoped endpoints returned
  exact `200` responses and no mutations were observed.
- Full Pivot: 150 files, 1,723 passed, 0 failed.
- Frontend pre-final fixture run: 173 files, 1,256 passed; focused nested-mock
  cleanup: 25 passed with no warnings.
- Frontend final authoritative bounded-worker package-script Vitest JSON report
  `/tmp/fleet-frontend-vitest-closeout.json` recorded `success=true`, with
  `1,257/1,257` tests passed and `0` failed across 173 test files; no nested
  `vi.mock` warnings appeared.
- Frontend check/type/lint and production build were rerun after source changes
  and passed; the existing JavaScript chunk warning was 1,355.38 kB.
- Real Chrome reran the secondary read journey after the status correction: 1/1
  passed, the canonical six status values were present, `todo` was absent, and
  no failed API response, browser error, console error, or mutation was seen.
- Convex remains red at 1,299 passed, 139 failed, 0 errors; TD-263 remains
  open.

### Open closeout sequence

1. Run the approval-gated credentialed acceptance for one agent, one
   sprint/task assignment, and one Pi cycle with continuous mode disabled.
2. Complete TD-263 Convex cleanup and rerun the Convex gate.
3. Repair the isolated Playwright web-server/source contract. It currently
   forces Bun sources and assumes external Pivot/Convex services, while Agent
   History remains Convex-only. The default supervised live stack and targeted
   Bun Sprint/Task History are proven; an isolated all-Bun full-surface run is
   not.
4. Resume the remaining original audit issues, then update the registry only
   when the exact acceptance evidence exists.

## TD-265 closeout addendum — 2026-08-09

This addendum records the later notification data-disposition closeout. The
historical route findings above remain preserved as audit evidence and are not
being rewritten as current-state claims.

### Local data boundary

- Clean archive evidence is commit `515f4f98`, without `.env.local`; the
  all-Doctor-allowlist regression guard followed in `6b397beb`.
- The configured local anonymous Convex persistence tables were mapped
  read-only. Both `notifications` and `notificationPreferences` reported
  `numValues: 0` and zero stored bytes.
- The watcher log records deletion of `notifications.by_user`,
  `notifications.by_user_and_read`, `notifications.by_user_and_type`,
  `notifications.by_created_at`, and `notificationPreferences.by_user`, then
  reports Convex functions ready. No direct SQLite/data mutation was performed.
- No remote deployment was configured or inspected. This local evidence does
  not claim remote rows were zero or that remote deletion occurred; every other
  deployment must independently run a zero-row preflight before applying the
  schema deletion.

### Closeout gates

- Focused deletion coverage: `466/466`.
- Convex runtime: `105/105` across 21 files; remaining Convex suite:
  `914/914` across 31 files; Convex typecheck passed.
- Pivot: `1709/1709` across 148 files plus typecheck. Frontend: `1252/1252`
  across 172 files, check, and build. The build produced 2800 modules and a
  `1281.66kB` main bundle (`362.45kB` gzip) with the known over-500k advisory.
- Real system Chrome: `3/3` in 1.4 minutes, real health `200`, with no mocks,
  route interception, seeds, mutations, or credentialed factory action.
- Doctor passed as-any, boundary, stub-mutation, and status-vocabulary checks.
  Expected failures remain only the 516-line `qualityWorkflowRunner` god-file
  and 65 unrelated orphan/stale-allowlist debt items.
- Graph synchronization reported 5,646 nodes, 7,864 edges, and 671 files;
  graph audit noise remains the known issue #2 limitation. `git diff --check`
  passed, and no package, lockfile, local database, or generated artifact
  changed.

## TD-266 closeout addendum — 2026-08-09

The fleet bootstrap readiness follow-up is complete in
`1a6e8169635afb08e2c8a012dca455b9da6a3204`. Project identity and selection now
settle independently from optional health, agent, and harness reads; optional
resources retain finite loading/ready/error-retry states. The existing Convex
id/slug/path identity and read-only route boundaries were preserved, and no API
expansion or credentialed factory mutation was performed.

### Acceptance evidence

- Focused integrated coverage passed **25 files / 148 tests**. Full frontend
  passed **176 files / 1,277 tests in 167.44s**; frontend check, build, and
  repository lint passed. The build produced 2,800 modules and a
  **1,354.15kB / 382.78kB gzip** main bundle; the known chunk warning remains.
- Pivot typecheck passed. Full Pivot passed **1,707/1,709 tests**; only the
  `orgChartAgents.piReadiness` cases failed because installed
  `/home/daniebo/Desktop/pi-measure-harness` lacks the full model reference
  `kimi-for-coding/kimi-for-coding-highspeed` required by the seeded intern.
- Real system Chrome used no mocks, interception, seeds, credentials, or
  mutations: final matrix **3/3 in 21.8s**, final cold repeats **5/5 in
  17.4s**. Selector samples `1509,1529,1542,1575,1553`ms yielded p50 **1542**
  and nearest-rank p95/max **1575**; slug-resolution samples
  `300,296,293,295,292`ms yielded p50 **295** and p95/max **300**. All
  configured project/agent/harness sources were Convex, page Bun catalog calls
  were zero, health responses were 200, and mutations/page/console/request/API
  errors were zero.
- Read-only API characterization found projects list **21 rows / 200 /
  1.720ms**, slug detail **200 / 2.903ms** with canonical id/slug/path, agents
  **[] / 200 / 1.440ms**, and harnesses **8 rows / 200 / 1366.453ms**. No API
  expansion was needed.
- Graph synchronization covered 41 files (**75→354 nodes**, **268→521
  edges**); stats were **5,824 nodes / 8,118 edges / 706 files**. The audit
  remains red/noisy with **676 `orphan_edges`** plus generated/dependency/CSS/
  schema/field/route limitations in the existing graph tooling.
- Doctor's as-any, boundary, stub-mutation, and status-vocabulary checks passed;
  known red findings are only the 516-line `qualityWorkflowRunner`, 65 orphan
  findings, and 38 stale allowlist warnings. The warning inventory remains:
  React `act` warnings across SprintPlanningPage, ProjectViewPage
  save/perf, AgentDefaults, ProjectTemplates, Retrospective, DependencyEditor,
  useProjectView, useAgentForm, ProjectCard, AgentsPage, and useSprintPlanning;
  a Vitest `vi.fn` warning in App tests; a Kanban duplicate-key warning; and the
  expected InsightsErrorBoundary log.

### Next priorities and fix plan

The earlier sequence's fleet bootstrap item is now closed. The next bounded
priorities are: (1) correct harness roster drift, starting with the missing Pi
harnesses behind the two `orgChartAgents.piReadiness` failures; (2) restore
warning trust by repairing the listed async, mock, and key warnings without
global suppression; (3) split the oversized frontend bundle while preserving
the core project path; and (4) address remaining Doctor/graph audit findings
after generated/dependency/CSS/schema/field/route limitations are fixed. The
credentialed factory acceptance remains explicitly unrun.

## TD-267 closeout addendum — 2026-08-09

The Pi readiness gate is restored in `f7fc4fe2`. The seeded `intern`, its active
agent definition, and the org-chart row now use the installed harness's
cost-efficient bounded-work model `openai/gpt-5.6-luna`. The retired
`kimi-for-coding/kimi-for-coding-highspeed` entry was removed from the active
served-model contract. Historical ADR, report, and closeout references were
left unchanged, and the external harness was not edited.

### Acceptance evidence

- Focused readiness passed **5/5 with zero skips** and 20 expectations; both
  installed-harness drift checks executed. Full Pivot passed **1,709/1,709**
  tests with 3,819 expectations across 148 files in **8.09s**. Pivot typecheck,
  frontend check, repository lint, and diff validation passed.
- The final real system-Chrome matrix passed **4/4 in 24.0s**. The new
  Agents/Providers journey follows the runtime Bun/Convex source boundary,
  accepts only truthful finite empty or populated states, waits for provider
  reads and all tracked backend requests to settle, and records page, console,
  request, response, mutation, and forbidden-action telemetry. It observed
  zero writes, page/console/API errors, or unrecovered request failures.
  Superseded `net::ERR_ABORTED` reads remain visible and count as recovered only
  when the same method/path has a successful 2xx response.
- No credential, seed, import, dispatch, live Convex mutation, external-harness
  write, or Bounded Factory action ran. A persisted agent row, if one exists in
  another deployment, remains unchanged until a separately approved sync.
- Incremental graph updates covered three TypeScript files (**3→24 nodes,
  6→27 edges**) and two active docs (**0→2 nodes**). Implementation stats were
  **5,847 nodes / 8,139 edges / 709 files**. Audit still exits 1 with **677
  `orphan_edges`**, dominated by generated Convex declarations, dependencies,
  test helpers, and unsupported stale-field/route checks. Synchronizing six
  closeout docs then produced current stats of **5,851 / 8,139 / 713**;
  incrementally updating this audit-report Markdown itself still exits 4 with
  `Expected the module specifier to be a string literal.` Fresh evidence was
  added to [GitHub issue #2](https://github.com/bodangren/fleet-commander/issues/2#issuecomment-5229216912);
  no allowlist churn was made.
- Doctor retained the known 516-line `qualityWorkflowRunner`, 65 orphan
  findings, and 38 stale allowlist warnings. All other Doctor checks passed.

### Next priorities and fix plan

The harness-roster blocker is closed. Next is a dedicated warning/test-trust
track for the React `act`, Vitest mock, and duplicate-key warnings recorded in
the TD-266 addendum. After that: split the oversized frontend bundle, then work
through remaining Doctor/graph/dead-code findings in bounded tracks. The
credentialed Bounded Factory acceptance remains explicitly approval-gated.

## TD-268 closeout addendum — 2026-08-09

TD-268 closed in implementation commit `4fed5cb7`. The prior audit history and
its historical warning references remain unchanged. The opening track record
was **59 React `act(...)` warnings across 12 areas**, plus one App bare `vi.fn`
warning, one Kanban duplicate key, and one expected `InsightsErrorBoundary`
error log. A fresh git-archive reproduction of opening commit `c5c2fa2b`,
targeting 20 files, emitted **60** `act` warnings (Sprint: **8**, Project View
**15**, agent config **28**, secondary **9**) plus one duplicate key. This
timing/setup discrepancy is recorded as replay variability; it does not replace
the opening record or imply a deterministic per-area baseline.

### TD-268 acceptance evidence

- Focused aggregate: **23 files / 154 passed**, warning-free. The expected
  Insights boundary log was captured, asserted, and restored locally; no
  unexpected `act`, bare `vi.fn`, duplicate-key, or console warning output
  remained.
- Final full frontend: **176 files / 1,285 passed in 157.87s**, zero warning
  output. Two earlier clean full runs were **1,284 passed** before the added
  regression; the final count retains that regression.
- Pivot: **148 files / 1,710 passed**. Convex runtime: **21 files / 106
  passed**. Remaining Convex Bun/pure: **31 files / 914 passed**. Focused route
  coverage: **42 passed**. Frontend check, repository lint,
  frontend/Pivot/Convex typechecks, and the 2,800-module production build
  passed. The build retains the **1,354.26kB / 382.84kB gzip** over-500k
  advisory.
- Real system Chrome: **4/4 specs in 26.9s**. `live-core` opened and cancelled
  Save as Template against the actual GET, scrubbed the path, asserted exact
  task/agent counts, and observed zero POST/PUT/PATCH/DELETE. Services on
  5173, 8081, and 3210 all returned 200. No credentials, seed/import, factory
  action, external-harness write, or browser/API mutation ran.

Weak tests exposed four real production boundaries: ProjectDetail omitted
description/assigned agents; a legacy imported path leaked description data;
canonical `assigneeId` was not resolved; and an optional agent failure could
return 500. The implementation fixed these with a deduped ID→name runtime join,
safe project roster fields, resilient detail handling, and sanitizer/new-import
paths that blank descriptions. These focused changes preserve product behavior
and are covered by the warning-recovery aggregate.

### Residuals and next priority

Measure Doctor exited 1 only for the known 516-line
`pivot/src/orchestrator/qualityWorkflowRunner.ts`, 65 orphan exports, and
stale allowlist/graph noise. The required graph synchronization covered 31
files (**94→254 nodes**, **190→358 edges**); current stats are **5,949 nodes /
8,307 edges / 733 files**. Graph audit was silent for over 90 seconds and was
stopped; the known issue #2 limitation remains. No allowlist churn was made.

The next fix-plan priority is P1 frontend bundle splitting for the >500k
advisory, followed by bounded Doctor god-file/orphan-debt tracks. Bounded
Factory activation remains approval-gated.

## TD-269 fix-plan addendum — 2026-08-09

TD-269 is opened as the next P1 delivery-size track. This is opening evidence,
not an implementation or closeout claim. The baseline production build ran
from `frontend/` with the approved local Bun binary because `bun` was not on
the shell PATH: `bun run build` exited 0, transformed **2,800 modules**, and
emitted a largest JavaScript asset of **1,354.26 kB minified / 382.84 kB gzip**.
Vite printed its unchanged default `Some chunks are larger than 500 kB after
minification` advisory.

The current `frontend/src/router.tsx` eagerly imports **34 page modules** and
the graph records **41 outgoing edges** from that router file. `recharts` is
statically imported by **12 production files** and `@xyflow/react` by one;
Project View also statically imports coverage, dependency, and performance tab
modules even though those tabs are selected after the core page loads. The
minimal fix plan is route-level dynamic imports first, then measured tab-only
module imports if the core chunk remains over the warning boundary.

Acceptance keeps Vite's default 500 kB warning boundary; every emitted JS
chunk must be at or below that minified limit, with raw and gzip sizes recorded.
Focused route/lazy tests, full frontend unit/check/typecheck/build/lint gates,
read-only system Chrome against the actual Vite → Pivot → Convex stack,
`build-graph update`/stats/audit, Doctor classification, and `git diff --check`
are all required. No mock/interception, seed/import, credentialed factory
action, browser/API write, package/API/schema change, or broad `manualChunks`
rule is in scope unless a measured dynamic-import failure justifies a narrow
exception.
