# Test Strategy: Orchestrator Core Hardening (Audit 2026-06-10)

## Testing Pyramid by Phase

- Phase 1 (FR-2/FR-4/FR-1): Unit-first. Mock the Convex HTTP client and
  the SDK. Assert on the prompt string, the `ExecutionResult` shape, the
  `recordCost` call args, and the `reconcileBudgetOnComplete` 4th arg.
- Phase 2 (FR-5/TD-213): Integration-first at the Convex side (50-way
  concurrent claim test must be a real test against the generated test
  runtime, not a mocked one). Unit tests on the orchestrator side for
  short-circuit semantics.
- Phase 3 (FR-3): Characterization-style for the merger stage (real
  `git` commands against a tmpdir repo, since the GitClient is a thin
  shell wrapper). Unit tests for `GitClient.merge` itself with a stub
  `runCommand`.
- Phase 4 (FR-6): Characterization for the server boot path with a
  mocked Convex client; unit tests for the AutoRunner tick logic.
- Phase 5: Verification only — no new behavior tests; all gates must be
  green.

## Shared Fixtures and Mocks

- Reuse the existing `Task` / `Track` builders from
  `pivot/src/orchestrator/orchestrator.test.ts` fixtures. Add a
  `seedTrackContext(trackId, { specMarkdown, planMarkdown })` builder
  for the new `tracks.getTrackContext` query.
- Mock the OpenCode SDK with a single `vi.fn()` for `sendPromptToSession`
  that returns `{ output, sessionId, tokensUsed: N }` where N is
  parameterised.
- Use `vi.stubGlobal('fetch', vi.fn())` in `beforeEach` to intercept
  Convex HTTP calls; record call args; `vi.unstubAllGlobals()` in
  `afterEach`.
- For the 50-way concurrent claim test, use Convex's test-runtime
  (`convex-test` if available, else the existing
  `convex/tasks.test.ts` harness) and `Promise.all` to fire 50
  mutations in the same test function. Do not use `setTimeout`-based
  interleaving — the test should be deterministic.
- For the merger git test, use a real local `git init` tmpdir; create a
  `main` branch with one commit, a feature branch with a second commit,
  and verify the squash-merge result has exactly one new commit on
  `main`.

## Cross-Phase Edge Cases and Dependencies

- **Token splits (FR-4):** `tokensUsed` from the SDK is a total. We
  split by `inputTokens = estimateTokens(promptText)`,
  `outputTokens = tokensUsed - inputTokens`. Test: prompt of 1000
  chars → `inputTokens = 250`, `tokensUsed = 600` → `outputTokens =
  350`. Test the degenerate case: `tokensUsed < inputTokens` → clamp
  `outputTokens = 0`, do not record a negative value.
- **Context cap (FR-2):** if `specMarkdown.length + planMarkdown.length
  > contextMaxChars`, truncate at the boundary, append `[truncated]`.
  Test with a 32k-char spec/plan; assert final prompt ≤
  `contextMaxChars + 32`.
- **Concurrent claim (FR-5):** only one of 50 claims can succeed. Test
  that the 49 failures return `currentStatus: 'in_progress'` (not
  `ready`), proving they re-read the row.
- **Merger stage (FR-3):** conflict (manual edit on `main` after the
  feature branch was created) must return `MergeConflictError`. The
  orchestrator should catch that error, leave the feature branch
  alive, and create a blocker issue. Test the catch path.
- **Continuous mode (FR-6):** flipping `enabled` from true to false
  between ticks stops further dispatches. Flipping it back resumes.
  Test with two consecutive ticks against a mocked
  `getContinuousModeStatus`.

## Architecture Guardrails

- No `as any` introduced (the `typed_convex_boundary` track is closing
  the 191-cast debt; this track must not add to it).
- All new Convex mutations use `v.id('table')` for document IDs (the
  `convex_ids` lesson).
- The strict pipeline (Contract → Test → Implement → Doctor) holds
  within each sub-phase of Phase 1; Phases 2-4 follow the same order at
  the sub-task level.
- No behavior changes outside the six FRs. The
  `orchestrator_decomposition`'s characterization net must remain
  green.
- `execution_guard` (lessons-learned): any new async callback must use
  `withExecutionGuard`. The new AutoRunner tick does.
- The `as_any` allowlist, the `stub-mutation-allowlist`, the
  `boundary-allowlist`, and the `orphans-allowlist` must not grow
  because of this track.

## Per-Phase Test Notes

### Phase 1A (FR-2)
- `pivot/src/orchestrator/stages/executeWithRetry.test.ts`: capture the
  `executeTask` call args via a mock; assert prompt substring includes
  `# Specification` and `# Implementation Plan` with seeded markdown.
- `convex/tracks.test.ts`: cover `getTrackContext` happy path +
  not-found branch.

### Phase 1B (FR-4)
- `pivot/src/orchestrator/executor.test.ts`: cover `tokensUsed` split
  happy path, `tokensUsed < inputTokens` clamp, and the failure path
  (no `recordCost` call).
- `pivot/src/orchestrator/stages/handleSuccess.test.ts`: cover
  `recordCost` exact-once call with right args on success; cover the
  skipped-on-failure path.

### Phase 1C (FR-1)
- `pivot/src/orchestrator/orchestrator.test.ts`: cover
  `reconcileBudgetOnComplete(..., 0.42)` on success and
  `reconcileBudgetOnComplete(..., 0.10)` on failure.

### Phase 2 (FR-5 + TD-213)
- `convex/tasks.test.ts`: 50-way concurrent claim — exactly 1 success.
- `pivot/src/orchestrator/orchestrator.test.ts`: existing
  characterization tests must not regress; add a Red-phase test for
  the "another runner already claimed" short-circuit.
- TD-213 decision test: either a
  `pivot/src/orchestrator/dispatchPacer.test.ts` test that exercises
  the new wire-up, or a deleted test file (if the dead-code path is
  chosen).

### Phase 3 (FR-3)
- `pivot/src/git/client.merge.test.ts`: 3 tests (clean, conflict,
  invalid strategy). Use `runCommand` mock.
- `pivot/src/orchestrator/gitOrchestrator.merge.test.ts`: end-to-end
  against a tmpdir git repo (real git).
- `pivot/src/orchestrator/stages/handleSuccess.test.ts`: merger stage
  sequence assertion.

### Phase 4 (FR-6)
- `pivot/src/server.autoRunner.test.ts`: 2+ tests (boot-with-enabled,
  boot-with-disabled, mid-tick flip).
- The legacy `pivot/src/orchestrator/autoRunner.test.ts` (5 tests
  already) must remain green.

### Phase 5 (Closeout)
- Run the full `verify` gate. The `red_not_done` lesson applies: do
  not mark any task `[x]` until its gates are green at HEAD.

## Build-Graph Findings

- `graph.db` is fresh (mtime 2026-06-09 22:55, < 24h as of
  2026-06-10).
- `build-graph search` for `reconcileBudgetOnComplete`,
  `reserveBudgetAtDispatch`, `AutoRunner`, `selectCandidate`,
  `GitClient` confirms the symbols exist; the `callers` convenience
  returned no cross-file caller edges (the graph tracks `contains` /
  cross-file `imports` / `calls` but not in-file calls; this is
  documented in TD-240). For blast-radius purposes, use `grep -r` on
  the symbol name and `build-graph inspect` for the export site.
- Pre-track `build-graph stats`: 4,901 nodes, 7,026 edges, 610 files.
  Post-track: should be within ±50 nodes/edges (this track adds 1 new
  Convex mutation + 1 new query + 1 new GitClient method + 1 new
  taskContext parameter type — all within existing files or with
  minimal new modules).
