# Test Strategy: Bounded factory activation

## Principle

A test is useful only if it fails for the audited production defect. Route existence without handler behavior, injected fake orchestrators without production project resolution, fake Pi spawns without readiness, and component mocks without a real request are supporting tests—not acceptance.

## Red/Green contracts

| Lane | Red proof | Green proof |
| --- | --- | --- |
| Project identity | Current active-project loader drops status-less projects; slug is passed to an ID validator and `rootPath` is absent. | A production-seam test resolves the imported project slug to its typed ID and stored path and scopes one run to it. |
| Agent readiness | Current `/api/agents/:name/test` returns fabricated success; handler is never exercised by its route suite. | Handler tests invoke real readiness dependencies and fail closed for missing CLI/files/model/provider probe. |
| Pi discovery | Current editor reads an always-empty removed harness catalog and stale OpenCode discovery. | Route/hook integration proves selectable provider/models are derived from the installed Pi roster/model map. |
| Sprint safety | Current route creates a sprint and assigns tasks separately; UI would select every mapped task. | Convex mutation tests prove atomic rejection and exactly-one success; UI/request test proves zero-by-default and one assignment. |
| Explicit run | Current Project View posts to an unregistered endpoint; orchestrator tests inject fake project/run layers. | A registered scoped handler crosses the production resolver and bounded runner, returning one persisted terminal outcome. |

## Real browser contract

- Use Playwright with `/usr/bin/google-chrome`; do not use browser-harness or Kimi WebBridge.
- Do not install route interceptors or seed mock application state.
- Keep continuous mode disabled before, during, and after the run.
- Record the exact agent, project, task, sprint, run ID, response outcome, receipt path, and before/after task counts.
- A truthful blocked result is acceptable only when it includes the concrete readiness/provider failure and proves no task was claimed or mutated.
- If a real Pi process is spawned, require a bounded timeout/token budget and a clean/disposable worktree.

## Full gates

- Focused tests for every changed module, including revert/red-proof for repaired weak tests.
- Full Convex/frontend/Pivot suites.
- `bun --cwd pivot typecheck`, `bun --cwd frontend check`, root lint, and frontend production build.
- Incremental `build-graph update` for every changed TypeScript/TSX file.
- `bash measure/doctor.sh all`, with known graph/scanner and pre-existing god-file debt recorded rather than suppressed.
