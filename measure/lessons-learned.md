# Lessons Learned

> Curated working memory, not an append-only log. Keep at or below **50 lines**.

## Recurring Gotchas

- (convex_queries) `.filter()` + `.collect()` is banned; use `withIndex().order().take(n)` or `.first()`.
- (convex_validators) `v.optional(T)` means absent, not nullable; use `v.union(v.null(), T)` for null returns.
- (convex_ids) `v.string()` + `as any` for Convex document IDs is an anti-pattern; prefer `v.id('table')` and `ctx.db.get`.
- (as_any_mask) Every `as any` cast hides bugs; forbid new casts unless a tracked allowlist entry explains the boundary.
- (schema_status_drift) Always reference shared schema validators for status strings; hardcoded values become silent dead branches.
- (stub_mutations) Public functions returning placeholders must be implemented, removed, or explicitly deprecated with a track ID.
- (parallel_systems) Two production subsystems for one domain silently drift; declare one canonical path before adding another.
- (execution_guard) Wrap periodic async callbacks with `withExecutionGuard` to avoid overlapping runs.
- (state_mutation) Do not mutate shared task state optimistically before async updates; use rollback.

## Patterns That Worked

- (dispatch_constraints) Extract hard filters as pure functions; compose in `filterEligibleTasks`.
- (optimistic_mutation_rollback) Mirror Convex query state locally, invert on click, POST mutation, roll back on rejection, then re-sync from query.
- (mock_routing_args_shape) When tests must distinguish Convex calls on one mock client, route by args-shape instead of `ref.toString()`.
- (atomic_claim_pattern) Atomic claim mutations need a fallback for offline/mocked clients while preserving real single-winner behavior.
- (merger_stage_gating) Branch cleanup belongs to the merger stage only after merge success; executor/reviewer preserve the branch.

## Planning Rules

- (hot_path_proof) "Wired into hot path" requires a test through the real production import, not just a dependency-injected unit test.
- (red_phase_boundary) Red-phase commits may touch tests and Measure docs only; defer `graph.db` updates until Green/Review when source files change.
- (red_not_done) `[x]` requires Green code and gates at HEAD; Red-only work stays `[~]`.
- (fake_gate_mask) Fake gate tests prove plumbing only; pair them with at least one real command.
- (derived_state) Track status should derive from task completion and verification evidence, not stale metadata alone.
- (api_shape) Frontend fetch URLs and response shapes must be contract-tested against registered pivot routes.
- (production_hooks) If a class supports optional production hooks, verify the actual server/CLI constructor supplies them.
- (graph_rebuild) Never full-scan into canonical `graph.db` first; scan to a temp DB and replace only on success.
- (build_graph_audit_timeout) `build-graph audit` can exceed the 120s agent command timeout on this repo; use explicit long timeouts and summarize JSON output.
