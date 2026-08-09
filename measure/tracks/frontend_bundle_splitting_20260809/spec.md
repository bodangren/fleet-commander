# Specification: Frontend bundle splitting — TD-269

## Overview

The frontend currently ships the complete data-router page tree in one eager
entry graph. A baseline production build from the opening workspace produced:

| Evidence | Baseline |
| --- | --- |
| Build command | `cd frontend && /tmp/fleet-bun-baseline-package/package/bin/bun run build` (the canonical `bun` name was not on this shell's PATH) |
| Transformed modules | 2,800 |
| Largest emitted JavaScript | `1,354.26 kB` minified / `382.84 kB` gzip |
| Vite result | Exit 0, plus `Some chunks are larger than 500 kB after minification` |
| Router shape | 34 eager page imports in `frontend/src/router.tsx`; 41 graph-recorded outgoing edges |
| Heavy static consumers | `recharts` in 12 production files; `@xyflow/react` in 1 production file |

This is an explicit RED/baseline: the build succeeds but the unchanged
default Vite advisory remains, and the eager route graph makes optional pages
and tab-only chart/graph modules part of the initial payload. The baseline is
not a permission to change the warning threshold.

## Functional requirements

### FR-1: Split optional route modules

- Load optional page families (analytics/performance/costs, history,
  operations, settings, templates, agents/providers/harnesses, retrospectives,
  alerts/blockers, and similar non-core routes) on navigation through the
  existing React Router data-router contract or an equivalent route-level
  dynamic import.
- Preserve existing URLs, route nesting, redirects, loading/error semantics,
  AppLayout/FleetLayout outlet context, and page behavior.
- Keep the index/Portfolio, Dashboard, Project View, Sprint Planning, and Board
  path eagerly reliable unless measured evidence proves a smaller compatible
  eager boundary is required; any such change needs an explicit rationale.

### FR-2: Split heavy tab-only modules when route splitting is insufficient

- If the core route still exceeds 500 kB after route-level splitting, split
  only the measured tab-only modules that pull in `recharts` or
  `@xyflow/react` (currently Project View coverage/dependency/performance
  consumers and optional insight charts are the first candidates).
- Do not pre-load a heavy chart/graph library merely to render the core tab.
- Keep the existing tab labels, data requests, empty/error states, and user
  interactions unchanged.

### FR-3: Remove the advisory without threshold inflation

- The production build must emit no Vite “chunks are larger than 500 kB”
  advisory.
- Every emitted JavaScript chunk must be at or below the unchanged 500 kB
  post-minification warning boundary; report raw and gzip sizes.
- Do not add `build.chunkSizeWarningLimit` above 500, suppress the warning,
  or treat gzip size as a substitute for the minified-size oracle.

### FR-4: Preserve real behavior and source boundaries

- No Convex schema/API, Pivot route, product state model, package, lockfile,
  or unrelated UI refactor is in scope.
- The lazy boundary must not add read-side mutations, duplicate requests,
  fabricated data, or new loading spinners that can remain permanent.
- Keep existing shared providers and layout state available to lazy children;
  lazy loading must fail visibly and finitely if a chunk cannot load.

## Non-functional requirements and boundaries

- Prefer route-level/module-level `import()` and the smallest Suspense/error
  boundary needed to preserve current UX.
- Do not introduce `manualChunks` as a first response. It is allowed only if
  route/module splitting is measured insufficient, with a before/after chunk
  report, stable ownership rationale, and no broad vendor taxonomy.
- Do not split every icon, primitive, hook, or shared module for nominal gains.
- Do not add mocks to live E2E, intercept chunk requests, seed/import data,
  exercise credentialed factory actions, or permit browser/API writes in the
  read-only acceptance journey.
- Preserve the default Vite warning threshold and document any intentional
  residual tooling/Doctor/graph findings instead of hiding them.

## Acceptance criteria

1. A documented RED/baseline build shows 2,800 transformed modules,
   1,354.26 kB / 382.84 kB gzip largest JavaScript, and the existing advisory;
   implementation evidence shows the advisory is absent without a threshold
   increase.
2. The eager core path (Portfolio, Dashboard, Project, Sprint Planning, Board)
   passes focused route tests and real system Chrome without behavior changes,
   permanent loading, chunk errors, failed API responses, or unexpected
   console errors.
3. At least one optional lazy route from each affected family is opened in
   real system Chrome; its chunk request succeeds and its settled UI matches
   the existing route contract. No request interception or mocks are used.
4. Full frontend unit tests, focused route/lazy tests, frontend check/typecheck,
   build, and repository lint pass. The build report lists every emitted JS
   chunk and shows each at or below 500 kB minified.
5. `build-graph update` covers every changed TypeScript source file, followed
   by stats and audit. Existing graph issue #2 noise may remain, but no new
   source/route orphan is introduced and `graph.db` is updated only during
   implementation, not track setup.
6. `bash measure/doctor.sh all` is run and compared with the pre-existing
   baseline. Known god-file/orphan/stale-allowlist findings remain classified;
   no broad allowlist edit is used to make this track green.
7. No package, lockfile, Convex/Pivot source, schema, API, seed, credentialed
   factory action, or browser/API mutation is introduced by this track.

## Out of scope

- Vite/Vitest/React Router/package upgrades or changing `chunkSizeWarningLimit`.
- Manual vendor chunk architecture unless the measured dynamic-import result
  cannot meet the acceptance boundary.
- Rewriting pages, consolidating duplicate product state, fixing unrelated
  Doctor/graph debt, or changing the Bounded Factory approval boundary.
