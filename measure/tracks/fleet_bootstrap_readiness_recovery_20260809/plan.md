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

- [ ] Task 2.1 — Add a real-import hook contract that goes Red against the shared
  `Promise.all`, then Green: project-ready is independently observable while
  agents/harnesses are pending; optional failures expose finite error/retry
  states without clearing project data.
- [ ] Task 2.2 — Add integration contracts for retry isolation, project error
  versus empty-project behavior, health degradation, and direct id/slug project
  loading. Pin the real Convex project row shape and Bun/Convex source-selection
  request boundary. Do not use a mock-only test as the release proof.
- [ ] Task 2.3 — Characterize `GET /api/projects`, project detail, agents, and
  harnesses through the existing Pivot registrations (shape, resolver, status,
  and read-only behavior). If the bottleneck is outside these routes, record
  that result and do not add an API.
- [ ] Task 2.4 — Add the live-browser evidence harness around existing
  `live-core.spec.ts` coverage: resource timings, readiness marker(s), selector
  usability, and a request ledger that fails on bootstrap mutations.

## Phase 3 — Smallest implementation

- [ ] Task 3.1 — Separate project readiness from optional resource state in the
  smallest existing frontend boundary; avoid duplicate project fetches and
  preserve Convex/Bun source selection.
- [ ] Task 3.2 — Give agents, harnesses, and health explicit finite states and
  resource-scoped retry behavior. Remove only the global coupling proven by the
  Red contracts; keep optional status visible in consuming pages.
- [ ] Task 3.3 — Verify `/portfolio`, `/dashboard`, selectors, direct project
  id/slug links, and task/project surfaces under pending, success, and optional
  failure states. Do not change unrelated dashboard or factory behavior.
- [ ] Task 3.4 — Revisit the API decision gate using measured route evidence;
  if no existing boundary is proven insufficient, ship no API expansion.

## Phase 4 — Verification and closeout

- [ ] Task 4.1 — Run focused frontend, Pivot, and route/page integration tests,
  including the Red→Green contracts and no-mutation assertions.
- [ ] Task 4.2 — Run full clean gates: `bash measure/doctor.sh all`, Pivot tests
  and typecheck, frontend tests/check/build, repository lint, and `git diff
  --check`; update graph evidence only if source files are later changed.
- [ ] Task 4.3 — Run the live suite in real system Chrome with no mocks,
  interception, seeds, credentials, or factory action. Capture cold-load
  response/readiness budgets and network evidence for portfolio, dashboard,
  direct project, and selector/task routes.
- [ ] Task 4.4 — Publish measured p50/p95/max observations, residual limitations,
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
