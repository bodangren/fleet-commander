# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

## Recurring Gotchas

- (convex_queries) `.filter()` + `.collect()` is banned — use `withIndex().order().take(n)` or `.first()`
- (convex_validators) `v.optional(T)` means absent, not nullable; for null returns use `v.union(v.null(), T)`
- (convex_ids) `v.string()` + `as any` for Convex document IDs is an anti-pattern; always use `v.id('table')`
- (as_any_mask) Every `as any` cast is a type-system bypass that hides bugs; forbid `as any` in new code and use explicit destructuring instead
- (schema_status_drift) Always reference schema validators for status strings; hardcoded impossible values become silent dead branches
- (stub_mutations) Public mutations returning `null` or `args` without writes must be implemented, removed, or explicitly deprecated with a track ID
- (concurrent_auth) Never combine missing `auth.config.ts` with anonymous bootstrap; unauthenticated identity then becomes the only path
- (parallel_systems) Two production subsystems for one domain silently drift; declare one canonical path before introducing a second
- (state_mutation) Never mutate shared task state optimistically before an async update; use local variables and rollback on failure

## Patterns That Worked Well

- (self_healing_workflows) Circuit breaker with sliding-window; exponential backoff with jitter
- (dispatch_constraints) Extract hard filters as pure functions; compose in `filterEligibleTasks`
- (economic_modulators) Pure modulator functions TDD-tested without Convex mocking

## Bun + Convex Patterns

- (bun_mock_module) `mock.module()` persists across test files; prefer dependency injection over module mocks. Module-level caches (e.g., `StalenessCache`) are NOT shared between test and source modules — `_resetPolicyStatsCacheForTests()` called in `beforeEach` may not clear the source module's cache. Prefer injecting cache dependencies or testing through public API.
- (playwright_strict) `getByText('foo')` matches partial text; use `{ exact: true }` for unambiguous selectors
- (frontend_hooks) For hooks using `fetch`, mock with `vi.stubGlobal('fetch', vi.fn())` in `beforeEach` + `vi.unstubAllGlobals()` in `afterEach`; use `renderHook` + `waitFor` for async state

## Planning

- (track_closeout) "Wired into hot path" must be backed by integration tests through production imports, not a sibling unit test alone
- (test_coverage_claims) "Tested via X" in plan.md must mean X actually exercises the production code path, not that a test file exists
- (orphan_detection) Test-only inbound graph edges are a dead-code signal; wire useful exports into production or delete them with stale tests
- (dual_implementations) When replacing a subsystem, archive or delete the old implementation in the same track
- (dead_code) When building replacement components, remove or archive the old ones — dual implementations cause confusion and stale tests
- (duplication) Utility functions duplicated across sibling components should be extracted to a shared lib
- (api_shape) API response shape must match frontend expectations — assemble on the server, wrap Convex raw data in `{ data }` for pivot consistency
- (derived_state) Don't trust declared status from imported markdown — derive effective track status from actual task completion ratios
