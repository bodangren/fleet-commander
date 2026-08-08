# Test Strategy: Convex test trust recovery

## Principle

An assertion is acceptance evidence only when it crosses the production contract it claims to protect. Direct helper tests can explain a calculation, but they cannot prove Convex registration, validators, schema indexes, authentication, or runtime serialization. The red/green sequence therefore keeps pure tests for fast diagnosis, adds the `convex-test` JavaScript mock runtime for registered-function coverage, and uses a real-browser backend journey for network/backend trust.

## Authoritative baseline and budgets

| Measure | Baseline (2026-08-09) | Final budget |
| --- | ---: | ---: |
| Convex tests passed | 1,299 | all discovered tests pass |
| Convex tests failed | 139 | 0 |
| Convex test warnings | 629 | 0 TD-263 warnings; all unrelated warnings itemized |
| Convex test errors | not separately accepted from baseline | 0 |

The earlier scalpel evidence reported 1,241 passed / 157 failed and is retained only as historical context. The final plan must name the exact command, test-file count, pass/fail/error totals, warning count, and any warning classification. “Quarantined,” “known,” or a warning suppression without a source/owner/debt ID does not meet the gate.

## Closeout evidence (2026-08-09)

- Convex runtime: `bun run vitest --run --config vitest.convex.config.ts` — **21 files / 105 tests passed** after splitting the two runtime god-files and adding the shared seed helper.
- Remaining Bun suite: `bun test` — **35 files / 957 tests passed / 0 failed** (`/tmp/fleet_td263_bun.out`).
- Pivot clean checkout: **150 files / 1,726 tests passed**; typecheck passed after generated budget return typing and the production-scan classifier test fix.
- Frontend clean checkout: **173 files / 1,260 tests passed in 211.03s**; format/lint/tsc/build passed, with 2,803 build modules and an existing >500k advisory.
- Convex typecheck: `bun run ./pivot/node_modules/.bin/tsc --noEmit --project convex/tsconfig.json` — passed.
- Warning ledger: **23 notification-only wrapper warnings** remain outside the TD-263 migration scope and are owned by the next P0 notification authorization/security track. No TD-263 warning is silently suppressed.
- Frontend warning ledger: **59 React `act` warnings across 12 legacy files** plus one duplicate-key warning in `ProjectViewPage.typedApi.test.tsx`; this is separate follow-up debt and is not counted against TD-263.
- Employees/runs/scheduler/unused UI and hook ownership is explicitly deferred to **TD-247**; no replacement compatibility surface was added.
- Chrome aggregate: **3 passed / 1 approval-gated skipped in 1.2m**. The read-only history journey observed project-scoped status+search requests, HTTP success, settled pages, and rows satisfying both filters.

## Red/green contracts

| Lane | Red proof | Green proof |
| --- | --- | --- |
| Auth identity | A protected registered function can pass under a fake anonymous/direct context, or a required identity is absent. | `convex-test` invokes the registered function with `withIdentity` and proves unauthenticated access fails while the stable `tokenIdentifier` path succeeds. |
| Validator/dead type cleanup | A deleted pipeline validator/type or stale literal is still treated as a supported contract. | Source/vocabulary tests prove only live shared validators remain and codegen/typecheck pass without compatibility resurrection. |
| History filter/index/perf | Status is filtered after the limit, combined search reads unbounded rows, or all agents are collected. | `convex-test` query tests seed enough rows to distinguish pre-limit filtering, assert exact filtered results/pagination, and cover bounded agent enrichment; Chrome proves the backend request/response path. |
| Analytics vocabulary | Direct helper tests accept stale task states or fabricate metrics that the registered query cannot produce. | Canonical validator-derived states plus an authenticated `convex-test` JavaScript mock-runtime smoke prove metric-helper output from schema documents; Chrome remains the real backend proof. |
| Auth config | Convex compilation rejects the environment access or a test-only global declaration masks deployment drift. | Convex typecheck/codegen and isolated fixture tests pass with deterministic environment restore. |
| Employees orphan suite | The direct-wrapper suite passes contradictory fake-ID CRUD/assign/workload assertions while bypassing callers, registration, and the agents-vs-employees schema boundary. | Caller/source audit confirms the suite is an inconsistent orphan surface; `convex/employees.test.ts` is removed from TD-263 acceptance with no runtime replacement or production compatibility path. Safe employees/runs/scheduler/UI/schema removal is deferred to TD-247. |

## Runtime conversion inventory

Phase B starts with an inventory of direct-wrapper tests and classifies each as migrate or retain with a documented reason. Critical supported candidates include dependency mutations, notifications/preferences, analytics/cost, history, and auth-sensitive handler tests currently importing `*Handler` and constructing `createMockCtx`. The employees legacy suite is classified for removal after the caller/source audit rather than migration because it encodes an inconsistent orphan surface; no production API is revived to preserve it. Migrated tests must use the installed `convex-test` package, its schema/module map, `import.meta.glob` module discovery, public `api.*` references, and `withIdentity`; this is a JavaScript mock runtime, not a live Convex backend. A direct call to a handler with a hand-built `db` remains a unit test, not runtime acceptance.

## Employees orphan-surface decision

The TD-263 caller/source audit found no router/render caller for `EmployeesPage`, no consumer of the `useActiveEmployees` re-export, no Pivot caller, and only generated-API/test ownership for `convex/employees.ts`. `convex/scheduler.ts` is explicitly migration-only, and the old suite's fake-ID expectations cross the `agents`/`employees` boundary inconsistently. Accordingly, `convex/employees.test.ts` is removed from TD-263 acceptance and is not replaced with a mock-runtime suite. A separate future TD-247 dead-code/schema migration must decide how to remove employees/runs, scheduler, unused UI/hook, and related schema safely; that track is not opened by TD-263.

## Runtime boundary

`convex-test` provides in-process JavaScript runtime coverage for registered Convex functions, schema validators, and identity handling. It does not connect to a local or deployed backend and cannot prove network wiring, deployment state, or persisted backend data. The real Chrome journey is therefore required for backend history/filter proof.

## Metric-helper runtime smoke

Seed minimal canonical task/work-run/error documents through the `convex-test` JavaScript mock runtime, attach an authenticated identity, invoke the registered analytics query path, and assert one completion/queue/bottleneck/session metric result. Keep pure helper tests for edge cases, but require the runtime smoke to catch validator drift, auth drift, and serialization/registration failures; use Chrome for real backend proof.

## Real Chrome history/filter proof

- Use the local stack and system Chrome (`/usr/bin/google-chrome` when bundled Chromium is unavailable), with no route interception, mock adapter, `seedScenario`, browser-harness, or Kimi WebBridge.
- Open the existing imported project’s task history, select `backlog`, and search `Full test suite and build` (or the current imported-task equivalent).
- Observe the real history request and assert it carries both `status=backlog` and the search term; assert HTTP 200, no permanent loading/error state, and that every visible row matches both filters.
- Record console/page errors, failed core responses, and the exact project/filter values. This is read-only: do not import, seed, start, assign, dispatch, or mutate.
- A browser-found history regression was repaired and covered: combined status+search requests now carry both filters, and the visible result assertion distinguishes older matching rows from newer nonmatches.
- A separate Quality direct-route run exposed a readiness regression: while fleet bootstrap was pending, the page showed `Syncing…` / `Loading imported projects…` without a Project combobox. A focused frontend regression proves the selector appears after bootstrap resolves. Sequential real Chrome passed, so no production change or timeout weakening was justified; the readiness behavior remains recorded for follow-up rather than treated as a Convex backend failure.

## Full gates

- Focused Convex tests for each changed contract and all migrated runtime suites.
- Full Convex discovery command with quarantine enforcement (`VERIFY_REQUIRE_CONVEX=1`), then full Pivot and frontend suites; current dirty-worktree evidence passed.
- `bun --cwd pivot typecheck`, `bun run --cwd frontend check`, root lint, and the frontend production build all passed; build produced 2,803 modules with an existing >500k advisory.
- `bash measure/doctor.sh all`; as-any, boundary, stub-mutation, and status-vocabulary checks passed. The scan now reports only the pre-existing `qualityWorkflowRunner.ts` god-file (516 lines) and the same 65 orphan/allowlist findings; the two new runtime test god-files were split.
- Follow-up debt: shared `useFleetData` bootstrap currently couples project controls to unrelated agents/harnesses readiness. `/api/projects` was observed taking up to **13.1s**, so the Project selector can wait on unrelated data; preserve this as follow-up work without creating a new track here.
- Clean-checkout acceptance: **passed** on `c3abeed7475ffd2098e2fe3b1b1a0c07f272c51c` (exit 0, `timedOut=false`, 341,518ms). The detached run also corrected the exact AST caller baseline (`orchestrator/run.ts`, `routes/projectRun.ts`, commit `65be5dcd`) and stabilized the `.env.local`-dependent core subscription test (10x archive, commit `c3abeed7`).
- Graph evidence: **5,799 nodes / 8,104 edges / 701 files**; audit timed out after >90s and remains Measure/graph issue #2.
- Incremental `build-graph update ./graph.db <changed-files>` after each source/test implementation batch, followed by the final graph audit required by repository policy. This update is deliberately not run while authoring this track’s docs.
