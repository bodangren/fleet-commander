# Test Strategy: Secondary read trust recovery

## Principle

Every regression test must fail for the audited live defect and must distinguish loading, loaded-empty, loaded-data, and error. Mocked component tests prove rendering only; one real browser session proves Vite -> Convex/Pivot behavior.

## Red/Green Contracts

| Lane | Red proof | Green proof |
| --- | --- | --- |
| History | Imported task documents fail `listTaskHistoryHandler` return validation; empty project selection leaves hooks disabled. | Convex handler tests cover imported fields; page/hook tests select the sole project and reach empty/data states. |
| Diagnose | Static/runtime contract targets nonexistent `audit:listAuditEvents`; proposals use `projectSlug: ''`. | Hook/page tests assert the real handler name, selected slug, finite empty/error states. |
| Analytics | Empty utilization/bottleneck arrays render spinners; no-source computations emit dated zeros. | Component tests assert labeled empty states; pure-function tests assert no-source results contain no fabricated observations. |
| Routing | Wildcard route replaces unknown URL with `/`. | Router test asserts a 404 page, attempted path, and Portfolio link without redirect. |
| Templates | Prior live audit observed missing-public-function failure. | Direct local Convex probe and real browser prove the existing handler now settles to loaded-empty/data; no new implementation unless evidence contradicts this. |

## Live Browser Contract

- Use one isolated `agent-browser` Chromium session after Green integration.
- Do not use browser-harness or Kimi WebBridge.
- Do not install route interceptors, `seedScenario`, or `setupMockApp`.
- Cover `/history/sprints`, `/history/tasks`, `/history/agents`, `/ops/diagnose`, `/analytics`, `/templates`, and an unknown URL.
- Record page errors, console errors, failed core responses, and loading indicators.
- Close the browser session after the sweep.

## Full Gates

- Focused tests for every changed module.
- `bun --cwd pivot typecheck`
- `bun run --cwd frontend test`
- `bun run --cwd frontend check`
- `bun --cwd pivot test`
- Frontend production build.
- Incremental `build-graph update` for every changed TypeScript/TSX file.
- `bash measure/doctor.sh all`, with pre-existing failures recorded rather than suppressed.
