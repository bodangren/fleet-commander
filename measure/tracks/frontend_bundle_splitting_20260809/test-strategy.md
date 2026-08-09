# Test strategy: Frontend bundle splitting — TD-269

## Oracles

The primary oracle is the minified emitted JavaScript size, not gzip size:

```text
RED baseline: 2,800 modules; 1,354.26 kB JS / 382.84 kB gzip; Vite advisory
GREEN target: exit 0; no over-500 kB advisory; every emitted JS chunk <= 500 kB
```

The secondary oracle is route behavior: core routes remain eager and usable,
optional routes load their chunks only on navigation, and lazy chunk failures
settle in an explicit finite error state.

## Red → Green layers

1. **Static RED contract.** Characterize the 34 eager page imports in
   `router.tsx`, the 41 graph outgoing edges, and the static Recharts/React Flow
   consumers. The pre-edit contract must fail until optional route/module
   imports are genuinely deferred.
2. **Build oracle.** Capture Vite's complete output. Parse every emitted JS
   file under `frontend/dist/assets`; compare minified byte size to the
   unchanged 500 kB boundary and retain raw/gzip evidence. A warning-free exit
   is required; `chunkSizeWarningLimit` must not be raised.
3. **Focused unit contracts.** Render the production route table with existing
   provider/fixture boundaries, await semantic headings/empty/error states,
   and verify core and optional routes resolve. Test a rejected lazy import if
   a new error boundary is introduced. Do not assert only that `import()` was
   called.
4. **Full frontend gates.** Run all Vitest files, `check`, build, repository
   lint, and diff checks. No route test may be weakened to accommodate lazy
   loading; await the behavior that users see.
5. **Real browser proof.** Run system Chrome against the actual Vite → Pivot →
   Convex stack. Observe chunk requests and page/console/API telemetry while
   opening the core vertical slice and representative optional routes. Require
   zero request interception, mocks, seeds/imports, credentials, or writes.
6. **Graph/Doctor gates.** Update the graph for changed source files, record
   stats/audit and known issue #2 limitations, and run Doctor. Existing
   god-file/orphan/stale-allowlist findings may be classified but not hidden.

## Route and chunk matrix

| Surface | Loading proof | Behavior proof |
| --- | --- | --- |
| Portfolio, Dashboard, Project, Sprint Planning, Board | Core shell/chunks available on first navigation | Existing focused tests plus `live-core.spec.ts`, no permanent loading/errors |
| Analytics, Performance, Costs | Route chunk requested on navigation | Settled headings/empty/error states and no failed API/console errors |
| History and Operations | Route chunk requested on navigation | Secondary read journey settles; no stale spinner or failed read |
| Settings, Templates, Agents/Providers/Harnesses | Route chunk requested on navigation | Existing route tests and finite settings/catalog state |
| Project View coverage/dependencies/performance tabs | Tab-only heavy chunk deferred if needed | Existing tab behavior/data state unchanged; no eager chart/graph load |

## Safety and regression matrix

| Scenario | Required result |
| --- | --- |
| Cold `/`, `/portfolio`, `/dashboard`, `/project/:id`, `/sprint-planning`, `/board` | Correct existing shell and settled data state; no chunk/API/console error |
| Cold optional route | One or more lazy chunks load successfully; existing route state appears |
| Chunk load rejection | Finite visible error/retry boundary; no infinite spinner or uncaught page error |
| Project View heavy tabs | Heavy dependency loads only when the tab is selected, if split is needed |
| Full emitted bundle | No JS chunk > 500 kB minified; no Vite advisory |
| Read-only Chrome | Zero POST/PUT/PATCH/DELETE and no interception/seed/import/factory action |
| Graph and Doctor | Changed source is synchronized; pre-existing findings remain visible/classified |

## Prohibited shortcuts

- No `build.chunkSizeWarningLimit` increase, warning suppression, gzip-only
  acceptance, or “largest chunk” omission.
- No broad `manualChunks` vendor map before dynamic route/module evidence.
- No arbitrary sleeps, `waitForTimeout`, fake timers, or network interception
  to hide chunk timing or loading behavior.
- No global error/console suppression, weakened route assertions, mock-only
  replacement for the live journey, or browser/API mutation.
- No package upgrade, unrelated refactor, Convex/Pivot change, schema/API
  change, seed/import, credentials, or Bounded Factory activation.

The final closeout must include the RED baseline, every emitted chunk's raw and
gzip sizes, focused/unit/check/build/full frontend results, system-Chrome
request/error/mutation telemetry, Doctor classification, graph update/stats/
audit, and `git diff --check`.
