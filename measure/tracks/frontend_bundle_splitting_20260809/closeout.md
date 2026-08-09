# Closeout: frontend bundle splitting

**Closed:** 2026-08-09  
**Status:** completed  
**TD-269:** Resolved  
**Track commits:** `cf972eac` (opening), `177c8701` (RED tests),
`a279ee32` (implementation), `6302bed8` (split cleanup), and `1b67dfc0`
(final source cleanup)

## Outcome

TD-269 removed the production Vite chunk advisory through route/module lazy
splitting. The unchanged 500 kB warning boundary remains in force: no
`manualChunks` rule, warning suppression, threshold increase, package change,
or unrelated API/schema/source refactor was introduced.

The RED baseline used the approved local Bun equivalent
(`cd frontend && /tmp/fleet-bun-baseline-package/package/bin/bun run build`)
because canonical `bun` was not on the shell PATH. It transformed **2,800
modules**, emitted a largest JavaScript asset of **1,354.26 kB minified /
382.84 kB gzip**, and printed the over-500 kB advisory. The final build still
transformed **2,800 modules**,
printed no advisory, and kept every emitted JavaScript chunk below 500 kB.
Recorded size-critical assets were:

| Asset             |  Minified |      Gzip |
| ----------------- | --------: | --------: |
| `index`           | 436.04 kB | 135.39 kB |
| `LineChart`       | 339.12 kB | 100.86 kB |
| `DependencyGraph` | 170.92 kB |  55.17 kB |
| `ProjectViewPage` |  70.70 kB |  16.97 kB |

## Core-boundary decision

The specification's preference for an eager Portfolio/Dashboard/Project/
Sprint Planning/Board path was followed for the first rebuilds. Measurements
then showed that the compatible eager boundary could not meet the size oracle:
optional-only code was approximately **1.12 MB**, Project View tabs were
approximately **563 kB**, Dashboard/index was approximately **545 kB**, and
Board/Planning was approximately **518 kB**. Those measured results justified
the specification's permitted lazy-core exception. Only the measured route/tab
modules were deferred; route names, outlet context, data contracts, loading
and error behavior, and core user behavior were preserved. The final Project
route measured approximately **436 kB**, with the emitted `index` asset at
436.04 kB.

## Verification

- Frontend unit suite: **177 files / 1,301 tests / 145.70s**, with zero warning
  output.
- Route-focused forward/reverse coverage: **4 files / 44 passed**.
- Lazy-route coverage: **15/15 passed**.
- Project View extraction coverage: **29/29 passed**.
- `npm run check`: **PASS**.
- `npm run lint`: **PASS**.
- Final cleanup commit `1b67dfc0` was covered by Project View extraction
  coverage **29/29**, frontend TypeScript checking, and the production build.
- Real system Chrome, serial: **7/7 in 26.4s**, covering the agent-harness
  roster, fleet bootstrap, live core, three lazy live journeys (including a
  real offline chunk failure), and secondary read. Source-aware telemetry
  recorded no mocks, request interception, credentials, or writes. Recovered
  `net::ERR_ABORTED` reads counted only when the same method/path later
  returned a successful 2xx response.
- Post-cleanup lazy-route rerun: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npm run test:e2e:live -- e2e/route-lazy-loading-live.spec.ts --workers=1` passed **3/3 in 8.5s**. An immediately prior invocation without the executable-path override failed at browser launch because Playwright-managed Chromium is unavailable; no test body ran in that attempt.

## Doctor and graph

All new Measure Doctor gates passed. The remaining findings are pre-existing:
one `pivot/src/orchestrator/qualityWorkflowRunner.ts` god-file at 516 lines,
65 orphan exports plus stale-allowlist findings after concurrent final source
cleanup, and no new `ProjectTabLoading` orphan.

Incremental graph updates succeeded. Final stats after source cleanup were
**5,991 nodes / 8,314 edges / 744 files**. `build-graph audit ./graph.db`
produced no stdout or stderr for 90 seconds and was Ctrl-C stopped under the
known issue #2 limitation. The reproduction was appended to [GitHub issue
#2](https://github.com/bodangren/fleet-commander/issues/2#issuecomment-5229868421).

## Safety and follow-up

The real-browser proof remained read-only: no route interception, mocked live
journey, seed/import, credentialed factory action, or browser/API mutation ran.
The full fix plan and historical audit remain durable in
[the core-workflow audit report](../core_workflow_recovery_20260808/audit-report.md),
which receives only an additive TD-269 closeout section.

The next bounded cleanup priority is the pre-existing 516-line
`qualityWorkflowRunner.ts`, followed by separating real unused exports from
Doctor/build-graph false positives. Bounded Factory activation remains
approval-gated and is not implied by this closeout.
