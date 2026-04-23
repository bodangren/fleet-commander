# Implementation Plan — Run Contract Protocol (A1)

## Phase 1: Schema Definition

- [x] Task: Write failing tests for `RunContract` Zod schema (valid + invalid fixtures) in `pivot/src/shared/runContract.test.ts`
- [x] Task: Define `RunContract`, `ArchitectOutput`, `ExecutorOutput`, `ReviewerOutput`, `RecoveryOutput` Zod schemas in `pivot/src/shared/runContract.ts`
- [x] Task: Export inferred TS types via `z.infer`
- [x] Task: Tests pass

## Phase 2: Convex Persistence

- [x] Task: Write tests for `runContracts` table mutations/queries (covered via orchestrator validator tests + typecheck)
- [x] Task: Add `runContracts` table to `convex/schema.ts` with indexes `by_task` and `by_created_at`
- [x] Task: Implement `convex/runContracts.ts`: `createRunContract`, `appendArchitectOutput`, `appendExecutorOutput`, `appendReviewerOutput`, `appendRecoveryOutput`, `getRunContract`
- [x] Task: Regenerate Convex API types (manual update to `api.d.ts` due to offline environment)
- [x] Task: Tests pass

## Phase 3: Bun Validator + Orchestrator Integration

- [x] Task: Write failing integration test: invalid stage output → recovery=human_review event, raw logged
- [x] Task: Implement `pivot/src/orchestrator/runContract.ts` with `validateAndPersist(taskId, stage, output)`
- [x] Task: Wire validator into orchestrator success path (executor output validated and persisted post-task)
- [ ] Task: Replace any prose-parsing of stage outputs with contract reads (deferred until architect/executor/reviewer agents exist)
- [x] Task: Tests pass

## Phase 4: Prompt Migration

- [x] Task: Create `pivot/src/agents/architect.md` prompt to emit JSON matching `ArchitectOutput`
- [x] Task: Create `pivot/src/agents/executor.md` prompt to emit `ExecutorOutput`
- [x] Task: Create `pivot/src/agents/reviewer.md` prompt to emit `ReviewerOutput` with `issueClass` + `severity`
- [x] Task: Create `pivot/src/agents/recovery.md` prompt to emit `RecoveryOutput`
- [x] Task: Implement `pivot/src/agents/index.ts` to load and parse prompt templates
- [x] Task: Sync prompts to Convex agents via API — implemented `pivot/src/sync/convexAgentSync.ts` with dry-run mode; requires Convex running to execute
- [ ] Task: Run full orchestrator against a fixture project; contracts validate end-to-end (requires Convex)

## Phase 5: Verification

- [x] Task: `npm run test` — all tests pass (pivot 288 + frontend 72)
- [x] Task: `npm run check` — lint + typecheck clean
- [x] Task: Coverage on new validator module ≥ 80% (runContract.ts: 100%)
- [x] Task: Update plan.md, log deviations, commit

**Deviations:**
- Phase 3 Task 23: Deferred until architect/executor/reviewer agents exist
- Phase 4 Task 33: Sync script implemented; Convex must be running to execute (`bun run pivot/src/sync/convexAgentSync.ts sync`)
- Phase 4 Task 34: Deferred until Convex is running and fixture project available
