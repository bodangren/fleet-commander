# Test strategy: Fleet bootstrap readiness recovery

## Test oracle

The primary oracle is a truthful finite state transition, not a screenshot or a
single aggregate `loading` flag:

```text
projects: loading -> ready | error -> retry -> loading -> ready | error
agents:   loading -> ready | error -> retry -> loading -> ready | error
harness:  loading -> ready | error -> retry -> loading -> ready | error
health:   loading -> ready | error -> retry -> loading -> ready | error
```

Project `ready` must be renderable while any optional resource is still
`loading`, and must remain renderable when an optional resource is `error`.
Project `error` must not be represented as an empty successful portfolio. Retry
must be bounded, explicit, and scoped to the failed resource.

## Red → Green layers

1. **Frontend unit contract.** Import the production hook through its real
   boundary and use deferred responses to hold agents/harnesses open, fail each
   optional response, and recover one retry. The Red assertion is that current
   shared settlement blocks project readiness; the Green assertion is that
   project identity settles independently and state/error fields remain truthful.
   Controlled response delays are for state ordering only; do not assert elapsed
   wall-clock time or use sleeps/fake clocks. Feed the Convex adapter the real
   registered query shape (`_id`, `slug`, optional `path`) and assert identity,
   slug, and path rather than fabricating obsolete `rootPath`/`status` fields.
2. **Route/page integration.** Exercise `FleetLayout`, portfolio redirect,
   dashboard, selector, project detail, and task/project routes with project
   success plus optional pending/failure. Assert direct id/slug links, selected
   project identity, retry visibility, and no accidental redirect to an empty
   portfolio. These contracts may use deterministic test responses, but they
   are not sufficient without the live run.
3. **Pivot characterization.** Exercise the existing project, agent, and
   harness route registrations with their current client/catalog boundary.
   Assert status codes, response shapes, project id/slug resolution, and that
   the read flow performs no writes. Record route timing only as characterization;
   add no endpoint based on a frontend-only symptom.
4. **Live system Chrome.** Run the real app against the local services using
   `frontend/e2e/live-core.spec.ts` (and the smallest additional live case if
   needed). Cover cold portfolio, dashboard, direct project id/slug, and
   selector/task navigation. Capture browser resource entries and readiness
   markers, plus the request ledger. Do not mock, intercept, seed, provide
   credentials, or invoke factory actions.
5. **Clean gates.** Run the full Doctor, frontend, Pivot, typecheck, build,
   lint, and diff checks listed in the plan. The track must not claim readiness
   from focused tests alone.

## Performance evidence and budgets

For each real cold load, record request start/end, first project-ready marker,
optional resource settlement, route, and outcome. Report p50, p95, and max for
the captured sample. Use 13,100ms as the initial project-response/readiness
regression guardrail because it is the observed TD-263 maximum; use the coupled
5–8s log range as baseline context, not as a fabricated assertion. A tighter
budget is valid only when supported by fresh measurements. Optional requests
may exceed the project budget, provided project readiness and navigation are
not gated by them.

Do not use `waitForTimeout`, fixed sleeps, fake timers, route interception, or
network stubs to manufacture the ordering or budget result. A performance
failure must point to an actual browser/network timestamp or a finite state
transition.

## Safety and regression matrix

| Scenario | Required result |
| --- | --- |
| Projects ready, agents/harness pending | Project selector and identity render; optional status remains loading. |
| Projects ready, agents or harness fails | Project remains usable; failed resource shows error and scoped retry. |
| Projects fails | Error/retry is explicit; no false empty portfolio or indefinite spinner. |
| Direct `/project/:id` or slug | Existing resolver and page remain reachable without import/scan. |
| Portfolio/dashboard/selector/task route | Existing navigation and selected project are preserved. |
| Browser bootstrap/retry request ledger | No POST/PUT/PATCH/DELETE, seed, credentialed factory, or read-side mutation. |

The final report must list the live environment, captured measurements, route
outcomes, endpoint decision, warnings, and residual limitations. It must not
claim that a warm local sample is a production SLA.
