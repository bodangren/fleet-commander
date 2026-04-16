# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

## Architecture & Design

- (2026-04-02, bun_orchestrator) Bun orchestrator mirrors Go module boundaries (evaluator, executor, resolver) for easier parity testing; Convex mutations replace Go in-memory state
- (2026-04-09, git_integration) Bun.spawn with `stdout: 'pipe'`: read with `await new Response(proc.stdout).text()`; GitClient uses project-specific cwd

## Recurring Gotchas

- (2026-04-11, git_orchestrator) Hook callbacks should return success/failure indicators — don't swallow errors and return success as if nothing went wrong; use named fields not positional args
- (2026-04-13, convex_queries) `.filter()` + `.collect()` is banned per Convex guidelines — define an index (`by_<field>_and_<field>`) and use `withIndex().order().take(n)` or `.first()`; unbounded `.collect()` scales linearly
- (2026-04-13, convex_validators) `v.optional(T)` means "field may be absent" (undefined-like), not nullable; for handlers that return `null`, use `v.union(v.null(), T)` — applies to `returns` validators too

## Patterns That Worked Well

- (2026-04-04, tech_debt_fixes) Review hooks wired as optional `runReview` in IssueHooks so orchestrator continues if review service unavailable
- (2026-04-05, typed_convex_api) Use Convex's generated `api` object from `_generated/api.ts` instead of string identifiers with `as never` casts — provides compile-time validation; test mocks must handle proxy objects
- (2026-04-05, continuous_orchestration) Continuous mode state stored in Convex settings table as JSON blob (scope: orchestrator, key: continuousMode) — avoids schema churn; idle detection uses last-loaded task snapshot to cut per-cycle queries
- (2026-04-05, self_healing_workflows) Circuit breaker with sliding-window failure tracking prevents cascades; exponential backoff with jitter avoids thundering herd; keep health-check logic out of dispatch
- (2026-04-08, e2e_testing) Playwright needs backend on :8081; tests skip gracefully when unavailable. 1.59.1 uses headless shell — `npx playwright install chromium` downloads both

## Planning Improvements

- (2026-03-26, conductor_bootstrap) Keep `conductor/current_directive.md` present when `autonomous_prompt.md` expects it, or autonomous runs start from stale bootstrap references
- (2026-03-27, validation_commands) Frontend validation commands live under `frontend/`; use `npm test` and `npm run build` there
- (2026-04-02, decommission_scope) Decommission tracks must scope-check import graphs before archiving; superseded modules can still be actively imported by a live runtime
- (2026-04-04, pivot_verify) Bun/Convex pivot may have already resolved old TD items (e.g. TD-005/006) — verify current state before implementing

## Bun + Convex Patterns

- (2026-04-10, hooks_pattern) GitHooks/CoverageHooks/IssueHooks all follow optional-callback pattern — passed to runProject, best-effort with warning logs; zero-cost when not wired
- (2026-04-14, coverage_enforcement) Track type derived from trackId heuristics (fix_→bug, chore/cleanup→chore, else feature); coverage passed via ExecutionResult.coveragePercentage
- (2026-04-15, route_convex_lookup) Route handlers without a Convex client add `ConvexHttpClient` as param and call `client.query(api.projects.getProjectBySlug, {slug})` — match server.ts pattern
- (2026-04-15, git_flags) `git checkout -b name base` where `base` starts with `-` is ambiguous; use `git checkout -b name -- base` to disambiguate
- (2026-04-15, convex_codegen_offline) When `npx convex dev` cannot run (network/binary/interactive issues), manually update `api.d.ts`: add `import type * as module from "../module.js"` and add module to `fullApi` mapping; `api.js` and `dataModel.d.ts` infer dynamically and need no changes
- (2026-04-15, run_contracts) `pivot/src/shared/runContract.ts` hosts Zod schemas; `pivot/src/orchestrator/runContract.ts` wraps validation + Convex persistence; schema mismatch in orchestrator success path logs `human_review` recovery event without crashing the task
- (2026-04-16, agent_prompts) Agent prompts are Convex-stored entities; version-controlled markdown templates in `pivot/src/agents/` provide backup/sync source; prompts request JSON matching RunContract schemas
- (2026-04-16, zod_v4_schema) Zod v4: `z.object({}).default({})` doesn't work as expected; to make all fields optional with defaults, use `z.object({field: z.string().default("x")})` without `.default({})` at object level; for optional objects with field-level defaults, use `Schema.optional().default({})` only if all fields have defaults
- (2026-04-16, dispatch_constraints) Extract hard constraints into pure filter functions returning structured rejections; compose in `filterEligibleTasks` and persist rejections to run contracts before scoring
- (2026-04-16, timeline_ui) Convex imperative subscriptions via `ConvexClient.onUpdate()` work in hooks without React provider; dynamic `import('convex/browser')` handles unavailable Convex gracefully; transformation functions are unit-testable without mocking the client
- (2026-04-16, rollup_functions) Pure rollup functions in `pivot/src/policy/rollup.ts` take raw records + options, derive bucket keys via `derivePersona`/`deriveTaskKind`/`deriveRepoType`, and compute aggregated stats; persona derivation prioritizes recovery > reviewer > executor (presence of field = that persona)
- (2026-04-16, dirty_buckets) `identifyDirtyBuckets` filters records by `createdAt > lastRunAt` and returns unique dispatch/harness keys, enabling incremental recompute; `PolicyStatsScheduler` runs hourly and no-ops when nothing changed
- (2026-04-16, convex_gte) Convex `withIndex('by_created_at', (q) => q.gte('createdAt', cutoff))` works for single-field indexes and avoids client-side filtering on large tables
- (2026-04-16, economic_modulators) Pure modulator functions (`applyBudgetPenalty`, `shouldEscalateRetry`, `selectHarnessByEconomics`, `requiredReviewDepth`) in `pivot/src/policy/economic.ts` are TDD-tested without Convex mocking; budget/govEvents stored in Convex tables `budgets` and `governanceEvents`; `budgetClient.ts` provides typed client functions following `statsClient.ts` patterns
