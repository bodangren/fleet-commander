# Implementation plan: Fleet bootstrap readiness recovery

This plan is intentionally narrow. The track begins with contracts and endpoint
characterization; implementation must not expand the API or reintroduce any
read-side mutation without evidence and an explicit scope decision.

## Phase 1 — Baseline and contract freeze

- [x] Task 1.1 — Record the `useFleetData` all-or-nothing bootstrap, `FleetLayout`
  fan-out, downstream portfolio/selector/deep-link consumers, and the existing
  Pivot read routes.
- [x] Task 1.2 — Freeze the no-mutation/no-seed/no-credential/no-route-
  interception boundary and retain the existing id/slug resolver and selectors.
- [x] Task 1.3 — Freeze an evidence method for project readiness and optional
  settlement. Carry forward the observed 13.1s project maximum and 5–8s coupled
  logs; treat the 1.775s warm harness sample as local evidence, not an SLA.

## Phase 2 — Red contracts and endpoint characterization

- [x] Task 2.1 — Add a real-import hook contract that goes Red against the shared
  `Promise.all`, then Green: project-ready is independently observable while
  agents/harnesses are pending; optional failures expose finite error/retry
  states without clearing project data.
- [x] Task 2.2 — Add integration contracts for retry isolation, project error
  versus empty-project behavior, health degradation, and direct id/slug project
  loading. Pin the real Convex project row shape and Bun/Convex source-selection
  request boundary. Do not use a mock-only test as the release proof.
- [x] Task 2.3 — Characterize `GET /api/projects`, project detail, agents, and
  harnesses through the existing Pivot registrations (shape, resolver, status,
  and read-only behavior). If the bottleneck is outside these routes, record
  that result and do not add an API.
- [x] Task 2.4 — Add the live-browser evidence harness around existing
  `live-core.spec.ts` coverage: resource timings, readiness marker(s), selector
  usability, and a request ledger that fails on bootstrap mutations.

## Phase 3 — Smallest implementation

- [x] Task 3.1 — Separate project readiness from optional resource state in the
  smallest existing frontend boundary; avoid duplicate project fetches and
  preserve Convex/Bun source selection.
- [x] Task 3.2 — Give agents, harnesses, and health explicit finite states and
  resource-scoped retry behavior. Remove only the global coupling proven by the
  Red contracts; keep optional status visible in consuming pages.
- [x] Task 3.3 — Verify `/portfolio`, `/dashboard`, selectors, direct project
  id/slug links, and task/project surfaces under pending, success, and optional
  failure states. Do not change unrelated dashboard or factory behavior.
- [x] Task 3.4 — Revisit the API decision gate using measured route evidence;
  if no existing boundary is proven insufficient, ship no API expansion.

## Phase 4 — Verification and closeout

- [x] Task 4.1 — Run focused frontend, Pivot, and route/page integration tests,
  including the Red→Green contracts and no-mutation assertions.
- [x] Task 4.2 — Run full clean gates: `bash measure/doctor.sh all`, Pivot tests
  and typecheck, frontend tests/check/build, repository lint, and `git diff
  --check`; carry forward known unrelated Pi-roster, Doctor, and graph reds, so
  this checkbox records execution and classification rather than an all-green
  claim. Update graph evidence only if source files are later changed.
- [x] Task 4.3 — Run the live suite in real system Chrome with no mocks,
  interception, seeds, credentials, or factory action. Capture cold-load
  response/readiness budgets and network evidence for portfolio, dashboard,
  direct project, and selector/task routes.
- [x] Task 4.4 — Publish measured p50/p95/max observations, residual limitations,
  endpoint decision, and a concise closeout; only then mark metadata/registry
  complete.

## Required command families

```text
bash measure/doctor.sh all
bun --cwd pivot test
bun --cwd pivot typecheck
bun --cwd frontend test
bun --cwd frontend check
bun --cwd frontend build
npm run lint
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
  bun --cwd frontend run test:e2e:live -- e2e/live-core.spec.ts --workers=1
git diff --check
```

The browser command is evidence collection, not a timing simulator. No fixed
sleep or fake clock may be used to make readiness appear to pass.

## Closeout evidence — 2026-08-09

- Implementation: `1a6e8169` (`fix(frontend): decouple fleet bootstrap resources`).
- Focused integrated coverage: **25 files / 148 tests passed**. Full frontend:
  **176 files / 1,277 tests passed in 167.44s**. Frontend check and production
  build passed (2,800 modules; main bundle **1,354.15kB / 382.78kB gzip**;
  the known over-500k advisory remains). Repository lint and Pivot typecheck
  passed.
- Full Pivot passed **1,707/1,709 tests**. The only failures were the two
  `orgChartAgents.piReadiness` cases: installed
  `/home/daniebo/Desktop/pi-measure-harness` lacks the full model reference
  `kimi-for-coding/kimi-for-coding-highspeed` required by the seeded intern.
  This is an environment roster limitation, not a TD-266
  bootstrap failure.
- Real system Chrome used no mocks, route interception, seeds, credentials, or
  mutations. The final matrix passed **3/3 in 21.8s**; five final cold repeats
  passed **5/5 in 17.4s**. Selector readiness samples (ms) were
  `1509, 1529, 1542, 1575, 1553` (**p50 1542; nearest-rank p95/max 1575**).
  Slug-resolution samples (ms) were `300, 296, 293, 295, 292` (**p50 295;
  p95/max 300**). Configured project, agent, and harness sources were all
  Convex; page Bun catalog calls were zero; health responses were 200; and
  mutations, page errors, console errors, request errors, and API errors were
  zero.
- Read-only API characterization found: projects list **21 rows, 200,
  1.720ms**; slug detail **200, 2.903ms**, with canonical id/slug/path; agents
  **[], 200, 1.440ms**; harnesses **8 rows, 200, 1366.453ms**. No API expansion
  was needed.
- Graph synchronization evidence covered 41 changed files (**75→354 nodes**,
  **268→521 edges**); current stats were **5,824 nodes / 8,118 edges / 706
  files**. The audit remains red/noisy with **676 `orphan_edges`** plus known
  generated/dependency/CSS/schema/field/route limitations in the existing graph
  tooling issue.
- Doctor's as-any, boundary, stub-mutation, and status-vocabulary checks passed;
  the known red findings are only the `qualityWorkflowRunner` 516-line file,
  65 orphan findings, and 38 stale allowlist warnings. The warning inventory remains visible: React `act`
  warnings across SprintPlanningPage, ProjectViewPage save/perf, AgentDefaults,
  ProjectTemplates, Retrospective, DependencyEditor, useProjectView,
  useAgentForm, ProjectCard, AgentsPage, and useSprintPlanning; a Vitest
  `vi.fn` warning in App tests; a Kanban duplicate-key warning; and the expected
  InsightsErrorBoundary log.
- No credentialed factory mutation was run.
