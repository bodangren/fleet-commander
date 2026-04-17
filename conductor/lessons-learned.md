# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

## Architecture & Design

- (2026-04-02, bun_orchestrator) Bun orchestrator mirrors Go module boundaries; Convex mutations replace Go in-memory state
- (2026-04-09, git_integration) Bun.spawn with `stdout: 'pipe'`: read with `await new Response(proc.stdout).text()`

## Recurring Gotchas

- (2026-04-11, git_orchestrator) Hook callbacks should return success/failure indicators — don't swallow errors; use named fields not positional args
- (2026-04-13, convex_queries) `.filter()` + `.collect()` is banned — use `withIndex().order().take(n)` or `.first()`
- (2026-04-13, convex_validators) `v.optional(T)` means absent, not nullable; for null returns use `v.union(v.null(), T)`

## Patterns That Worked Well

- (2026-04-04, tech_debt_fixes) Optional hooks (runReview) let orchestrator continue if service unavailable
- (2026-04-05, typed_convex_api) Use generated `api` object instead of `as never` casts; test mocks must handle proxy objects
- (2026-04-05, self_healing_workflows) Circuit breaker with sliding-window; exponential backoff with jitter

## Bun + Convex Patterns

- (2026-04-14, coverage_enforcement) Track type from trackId heuristics (fix_→bug, chore/cleanup→chore, else feature)
- (2026-04-15, run_contracts) Schema mismatch logs `human_review` recovery event without crashing
- (2026-04-16, dispatch_constraints) Extract hard filters as pure functions; compose in `filterEligibleTasks`
- (2026-04-16, zod_v4_schema) `z.object({}).default({})` doesn't work; use field-level defaults instead
- (2026-04-16, economic_modulators) Pure modulator functions TDD-tested without Convex mocking
- (2026-04-17, reconciliation_yaml) Project uses `js-yaml`; import as `import yaml from 'js-yaml'` and use `yaml.load(content)`
- (2026-04-17, bun_mock_module) `mock.module()` persists across test files; prefer dependency injection over module mocks

## Planning

- (2026-04-17, allocator_c2) Token-bucket pacer for budget pacing: bucket capacity = tokensPerHour, refill based on elapsed time
- (2026-04-17, simulation_c3) `selectBestCandidate` was missing `weights`/`allocationPolicy` forwarding despite `scoreCandidate` supporting them — caught during TDD
- (2026-04-17, simulation_c3) Pure simulation engine + aggregator can be fully unit-tested without Convex mocking; keep the route thin
- (2026-04-17, simulation_c3) Counterfactual metrics reuse historical outcomes for matched dispatches; diverged dispatches need estimated or lookup-based outcomes
- (2026-04-17, td028_index) Use `withIndex().unique()` for direct key lookups instead of `.collect().find()` — avoids full scan