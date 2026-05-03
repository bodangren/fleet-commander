# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

## Architecture & Design

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
- (2026-04-17, playwright_strict) `getByText('foo')` matches partial text; use `{ exact: true }` for unambiguous selectors
- (2026-05-03, frontend_hooks) For hooks using `fetch`, mock with `vi.stubGlobal('fetch', vi.fn())` in `beforeEach` + `vi.unstubAllGlobals()` in `afterEach`; use `renderHook` + `waitFor` for async state

## Planning

- (2026-04-17, simulation_c3) Pure simulation engine + aggregator can be fully unit-tested without Convex mocking; keep the route thin
- (2026-04-17, simulation_c3) Counterfactual metrics reuse historical outcomes for matched dispatches; diverged dispatches need estimated or lookup-based outcomes
- (2026-04-17, td026_index) For optional multi-field filters, add composite indexes and branch queries — never `.take().filter()` on large tables
- (2026-04-17, td028_index) Use `withIndex().unique()` for direct key lookups instead of `.collect().find()` — avoids full scan
- (2026-04-23, e2e_tests) Pages with hardcoded empty state (ReconcilePage) need API fetch wiring; e2e tests catch these broken functions
- (2026-04-23, td027_harness) When adding optional fields to Convex schema, use `v.optional(v.string())` and default with `?? 'fallback'` in rollup functions for backward compatibility
- (2026-04-24, e2e_task_timeline) TaskTimelinePage uses Convex real-time subscription; e2e tests run with VITE_CONVEX_URL empty, so only null/empty states are testable
- (2026-04-24, frontend_bugs) `mountedRef` cleanup bug: always reset `mountedRef.current = true` at effect start before async operations
- (2026-04-24, frontend_bugs) Silent `.catch(() => {})` hides errors; add error state and user feedback in all fetch calls
- (2026-04-25, yaml_security) Always use `yaml.load(content, { schema: yaml.DEFAULT_SCHEMA })` — bare `yaml.load()` allows arbitrary JS deserialization
- (2026-05-01, foundational_fixes) Convex schema changes require `npx convex dev` for type generation; manual edits to `_generated` are temporary
- (2026-05-03, analytics_dashboard) Frontend chart components use fetch to pivot server API, not direct Convex useQuery — keeps API layer consistent
- (2026-05-03, analytics_dashboard) Add time-based indexes (by_created_at, by_updated_at, by_started_at) for efficient range queries
- (2026-05-01, foundational_fixes) Structured error logging with context (taskKey, agentId, operation) replaces silent catches without crashing orchestrator
- (2026-05-03, symphony_pivot) Lifecycle hooks run via `sh -c` in worktree cwd; failures logged but never block task execution
- (2026-05-03, symphony_pivot) `{session_id}` template variable in harness command enables opencode session resumption without resolver changes
- (2026-05-03, e2e_fixes) E2e tests may expect UI text that doesn't match actual rendered content; verify selectors against component output