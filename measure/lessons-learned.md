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
- (jsx_escape) JSX text content with `{value}` interpolation must use `&gt;` entity, not `>` operator
- (derived_state) Don't trust declared status from imported markdown — derive effective track status from actual task completion ratios
- (kanban_scope) Scope Kanban boards to selected sprint/track — flattening 600+ tasks across 31 tracks overwhelms the UI
- (test_coverage_claims) "Tested via X" in plan.md must mean X actually exercises the code — pivot recommender tests don't cover Convex function handlers
- (track_closeout) Before marking a track complete: verify all spec acceptance criteria are checked, all `[~]` stubs are closed or documented as deviations, and test files exist for claimed coverage
- (cost_model) `calculateTotalEstimate` applies one agent's costPerPoint across all 4 pipeline stages — inaccurate when different agents handle different stages; need per-stage agent assignment for real cost estimation
- (dead_code) When building replacement components, remove or archive the old ones — dual implementations (e.g., old `components/KanbanBoard.tsx` vs new `components/kanban/KanbanBoard.tsx`) cause confusion and stale tests
- (fallthrough_logic) Functions with early returns for special cases but a blanket `return true` at the end (e.g., `isValidStatusTransition`) make the special-case checks dead code; test the false path to catch this
- (plan_parent_x) Parent tasks marked `[x]` while all sub-tasks are `[ ]` signals the plan wasn't followed — close sub-tasks individually or document why they're deferred
- (dual_data_paths) Rendering two conditional data sources (new timeline vs legacy run contract) in the same page creates confusion about which path is active — pick one and archive the other
- (stage_name_drift) Shared constants like STAGES arrays must live in one place — when 'merger' vs 'recovery' diverges between page and components, keyboard navigation breaks
- (duplication) Utility functions (e.g. `formatDuration`, `getStageStatus`) duplicated across sibling components should be extracted to a shared lib
- (monolithic_replacement) When a monolithic implementation replaces a component-based one, the unused components become dead code — remove or archive them immediately
- (test_mock_exports) Test mocks must export the same symbols as the module they replace; `vi.mock()` without explicit exports causes "No export defined" runtime errors
- (convex_auth_gap) Convex has no middleware chain — `resolveActor(ctx)` must be called explicitly in every handler; no guard on the module means all endpoints are unauthenticated
- (hook_wiring) Defining hooks in useConvexRealtime.ts doesn't auto-wire them to components; after a schema migration, audit every data-fetching component to ensure it uses the Convex hook, not a leftover fetch()+setInterval
