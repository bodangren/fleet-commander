# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

## Recurring Gotchas

- (2026-04-13, convex_queries) `.filter()` + `.collect()` is banned — use `withIndex().order().take(n)` or `.first()`
- (2026-04-13, convex_validators) `v.optional(T)` means absent, not nullable; for null returns use `v.union(v.null(), T)`
- (2026-05-04, review) Never mark plan tasks `[x]` before code is committed and tests pass — false claims recur and waste review cycles
- (2026-05-04, executor) Per-stream resource limits need shared counters; enforce combined stdout+stderr consumption
- (2026-04-13, generated) Manual edits to `_generated` files create type desync; always use `npx convex dev`
- (2026-05-04, metrics) Scaled confidence scores labeled as "latency" or "tokens" are fabrication, not proxy — rename honestly or remove
- (2026-05-04, validation) Agent prompt sections MUST match programmatic REQUIRED_SECTIONS — add a test that asserts they stay in sync
- (2026-05-04, security) LLM-generated markdown rendered as HTML must sanitize `javascript:` URLs
- (2026-05-04, convex_ids) `v.string()` + `as any` for Convex document IDs is a recurring anti-pattern; always use `v.id('table')`
- (2026-05-04, websockets) ConvexClient instances created per effect must be stored in a ref and explicitly `.close()`d in cleanup to prevent connection leaks
- (2026-05-04, state_mutation) Never mutate shared task state optimistically before an async update; use local variables and rollback on failure
- (2026-05-04, scheduler) Self-HTTP calls from schedulers are fragile and swallow errors; invoke handler functions directly or log failures explicitly
- (2026-05-04, failure_types) Distinguishable failure modes need distinct `failureType` values; reusing `'timeout'` for token limit exceeded hides root cause

## Patterns That Worked Well

- (2026-04-05, self_healing_workflows) Circuit breaker with sliding-window; exponential backoff with jitter
- (2026-04-16, dispatch_constraints) Extract hard filters as pure functions; compose in `filterEligibleTasks`
- (2026-04-16, economic_modulators) Pure modulator functions TDD-tested without Convex mocking

## Bun + Convex Patterns

- (2026-04-17, bun_mock_module) `mock.module()` persists across test files; prefer dependency injection over module mocks
- (2026-04-17, playwright_strict) `getByText('foo')` matches partial text; use `{ exact: true }` for unambiguous selectors
- (2026-05-03, frontend_hooks) For hooks using `fetch`, mock with `vi.stubGlobal('fetch', vi.fn())` in `beforeEach` + `vi.unstubAllGlobals()` in `afterEach`; use `renderHook` + `waitFor` for async state

## Planning

- (2026-04-17, td026_index) For optional multi-field filters, add composite indexes and branch queries — never `.take().filter()` on large tables
- (2026-04-17, td028_index) Use `withIndex().unique()` for direct key lookups instead of `.collect().find()` — avoids full scan
- (2026-04-24, frontend_bugs) Silent `.catch(() => {})` hides errors; add error state and user feedback in all fetch calls
- (2026-04-25, yaml_security) Always use `yaml.load(content, { schema: yaml.DEFAULT_SCHEMA })` — bare `yaml.load()` allows arbitrary JS deserialization
- (2026-05-03, analytics_dashboard) Frontend chart components use fetch to pivot server API, not direct Convex useQuery — keeps API layer consistent
- (2026-05-01, foundational_fixes) Structured error logging with context (taskKey, agentId, operation) replaces silent catches without crashing orchestrator
- (2026-05-03, symphony_pivot) Lifecycle hooks run via `sh -c` in worktree cwd; failures logged but never block task execution
- (2026-05-03, symphony_pivot) `{session_id}` template variable in harness command enables opencode session resumption without resolver changes
- (2026-05-09, jsx_escape) JSX text content with `{value}` interpolation must use `&gt;` entity, not `>` operator
- (2026-05-09, convex_validator_extend) Adding a new literal to a union validator requires updating ALL consumers (query return types, mutation args, etc.) — TypeScript catches these at compile time
- (2026-05-10, api_shape) API response shape must match frontend expectations — flat key-value from Convex ≠ nested `{ general, providers, websocket }` config object; assemble on server
- (2026-05-10, derived_state) Don't trust declared status from imported markdown — derive effective track status from actual task completion ratios instead
- (2026-05-10, kanban_scope) Scope Kanban boards to selected sprint/track — flattening 600+ tasks across 31 tracks overwhelms the UI; use sprint selector + collapsible accordions
- (2026-05-10, phase_parsing) Parse phase structure from plan markdown `## Phase N:` headers — never hardcode all tasks into a single wrapper phase; unphased tasks go into "Unphased"
- (2026-05-10, dead_features) Remove irrelevant features and routes — unused harness binary page replaced with providers config the app actually consumes; delete dead routes from App.tsx
- (2026-05-10, agent_display) Group agents by org-chart category with `displayName` as title — flat agent lists without hierarchy are hard to scan; show `@name` as subtitle
