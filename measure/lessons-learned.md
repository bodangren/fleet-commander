# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

## Recurring Gotchas

- (convex_queries) `.filter()` + `.collect()` is banned — use `withIndex().order().take(n)` or `.first()`
- (convex_validators) `v.optional(T)` means absent, not nullable; for null returns use `v.union(v.null(), T)`
- (review) Never mark plan tasks `[x]` before code is committed and tests pass
- (generated) Manual edits to `_generated` files create type desync; always use `npx convex dev`
- (convex_ids) `v.string()` + `as any` for Convex document IDs is an anti-pattern; always use `v.id('table')`
- (state_mutation) Never mutate shared task state optimistically before an async update; use local variables and rollback on failure
- (failure_types) Distinguishable failure modes need distinct `failureType` values; reusing `'timeout'` for token limit exceeded hides root cause
- (schema_status_drift) When checking status in business logic, always reference the schema validator — hardcoded strings like `'completed'` that don't exist in the union become dead-code branches silently
- (pure_vs_production) When a Convex query re-implements logic from a tested pure function, the tests validate the wrong code path — always call the pure function or test both
- (as_any_mask) Every `as any` cast is a type-system bypass that hides bugs; forbid `as any` in new code and use explicit destructuring instead
- (denominator_truncation) When truncating inputs for comparison, the denominator must use truncated lengths, not originals
- (test_data_schema_mismatch) Test fixtures must use values from real schema validators; tests with `'completed'`/`'failed'` against a `'planned'|'active'|''closed'` union prove nothing

## Patterns That Worked Well

- (self_healing_workflows) Circuit breaker with sliding-window; exponential backoff with jitter
- (dispatch_constraints) Extract hard filters as pure functions; compose in `filterEligibleTasks`
- (economic_modulators) Pure modulator functions TDD-tested without Convex mocking

## Bun + Convex Patterns

- (bun_mock_module) `mock.module()` persists across test files; prefer dependency injection over module mocks
- (playwright_strict) `getByText('foo')` matches partial text; use `{ exact: true }` for unambiguous selectors
- (frontend_hooks) For hooks using `fetch`, mock with `vi.stubGlobal('fetch', vi.fn())` in `beforeEach` + `vi.unstubAllGlobals()` in `afterEach`; use `renderHook` + `waitFor` for async state

## Planning

- (indexes) Use `withIndex().unique()` for direct key lookups; for optional multi-field filters, add composite indexes and branch queries
- (frontend_bugs) Silent `.catch(() => {})` hides errors; add error state and user feedback in all fetch calls
- (api_shape) API response shape must match frontend expectations — assemble on the server, wrap Convex raw data in `{ data }` for pivot consistency
- (derived_state) Don't trust declared status from imported markdown — derive effective track status from actual task completion ratios
- (test_coverage_claims) "Tested via X" in plan.md must mean X actually exercises the code — pivot recommender tests don't cover Convex function handlers
- (track_closeout) Before marking a track complete: verify all spec acceptance criteria are checked, all `[~]` stubs are closed or documented as deviations, and test files exist for claimed coverage
- (dead_code) When building replacement components, remove or archive the old ones — dual implementations cause confusion and stale tests
- (duplication) Utility functions (e.g. `formatDuration`, `getStageStatus`) duplicated across sibling components should be extracted to a shared lib
- (hook_wiring) Defining hooks doesn't auto-wire them to components; after a schema migration, audit every data-fetching component