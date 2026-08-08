# Specification: Fleet bootstrap readiness recovery

## Problem and evidence

The core workflow audit identified the next bounded recovery as decoupling project
identity and selection from unrelated agents, harnesses, settings, and dashboard
requests ([audit report](../core_workflow_recovery_20260808/audit-report.md)). The
current `frontend/src/lib/useFleetData.ts` starts health, projects, agents, and
harnesses in one `Promise.all`; a non-OK response turns the whole load into one
global error, and the shared loading flag has no per-resource readiness boundary.
`FleetLayout` invokes this hook for every route.

The observed baseline is not a universal SLA. TD-263 recorded `/api/projects`
cold observations up to 13.1s and coupled 5–8s logs. A fresh warm local sample
reported health 1.4ms, projects 25.8ms, agents 19.4ms, and harnesses 1.775s.
That sample is sufficient to prove the present all-or-nothing settlement can be
delayed by unrelated harness discovery; it is not a license to hard-code a
1.775s threshold.

Pivot currently exposes read routes for `/api/projects`, `/api/projects/:id`,
`/api/agents`, and `/api/harnesses`. Project list reads Convex catalog data;
harness listing reads the local Pi catalog. Project detail still resolves an id
or slug through the existing resolver. These boundaries must be characterized
before considering any endpoint change.

## Goal

Project identity, project selection, portfolio/dashboard entry, and direct
project deep-links become independently usable when project data is ready. Agent,
harness, and health resources may still be loading or may fail, but their state
must remain visible and retryable without hiding a ready project. The solution
must preserve existing selectors, `/portfolio`, `/dashboard`, `/project/:id`,
project task views, and direct id/slug navigation.

## Requirements

1. **Independent project readiness.** Expose a finite project state (loading,
   ready, or error with retry) that does not depend on agent, harness, settings,
   or dashboard requests. A ready project list or selected project must be
   renderable before unrelated optional reads settle.
2. **Independent optional states.** Health, agents, and harnesses each retain a
   finite loading/ready/error state and a bounded retry action. An optional error
   must not erase or downgrade already-ready project identity.
3. **Truthful failures.** Do not convert a failed project read into an empty
   portfolio, show an indefinite spinner, or report global success while an
   explicitly consumed resource failed. Retry must be finite and resource-scoped.
   The Convex project adapter must consume the real `listProjectsHandler` shape
   (`_id`, `slug`, and optional `path`), not the obsolete `rootPath`/`status`
   shape, so project identity and paths remain valid under either source.
4. **Read-only boundary.** Browser acceptance may issue only the existing read
   requests. No scan/import, factory action, agent test, settings mutation, or
   other POST/PUT/PATCH/DELETE may be triggered by bootstrap or retry. No read
   side effect may be introduced.
5. **API restraint.** Characterize the existing Pivot endpoints and their
   latency/shape first. Do not add an endpoint, stream, schema, or new data path
   unless the characterization proves the existing boundary cannot satisfy this
   contract and the smallest read-only change is documented and approved.
6. **Evidence-based budgets.** Record cold-load response and readiness timings
   from real system Chrome/network performance entries. Use the observed 13.1s
   project maximum as the initial regression guardrail and the coupled 5–8s logs
   as baseline context, then tighten only with measured evidence. These are
   measured budgets, not `sleep`, fake-clock, or arbitrary `waitForTimeout`
   assertions; optional reads may exceed the project budget without blocking it.
7. **Scope preservation.** Do not reopen the completed core workflow recovery,
   redesign dashboard data, activate the credentialed factory, remove the
   Convex/Bun boundary, or broaden this into unrelated settings or performance
   cleanup.

## Acceptance criteria

- Red→Green unit/integration contracts prove a project-ready state can render
  while agent/harness requests remain pending and while each optional resource
  independently fails; retry clears only the failed resource.
- Pivot route characterization records existing response shapes, id/slug
  behavior, and read-only request behavior. It explicitly records whether the
  13.1s bottleneck is upstream of the route before any API decision.
- Live system-Chrome cold loads cover portfolio, dashboard, a direct project
  id/slug link, and a project selector/task surface. Network evidence shows
  project readiness is not gated by optional settlement, with timestamps and
  resource outcomes captured rather than mocked.
- The live run uses the real application and system Chrome: no mocks, route
  interception, fixture seeds, credentials, or factory action. It observes and
  records requests, including the absence of bootstrap mutations.
- Existing route behavior, selectors, direct links, and truthful error/retry
  states remain intact; focused tests, full clean gates, and documentation all
  pass.
- Convex-backed project rows preserve internal id, slug, and optional path, and
  `useFleetData` does not issue redundant Bun project/agent reads when those
  slices are configured for Convex.
