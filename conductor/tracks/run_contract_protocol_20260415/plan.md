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

- [ ] Task: Update `pivot/src/agents/architect.ts` prompt to emit JSON matching `ArchitectOutput`
- [ ] Task: Update executor prompt to emit `ExecutorOutput`
- [ ] Task: Update reviewer prompt to emit `ReviewerOutput` with `issueClass` + `severity`
- [ ] Task: Update recovery/dispatcher recovery decisions to emit `RecoveryOutput`
- [ ] Task: Run full orchestrator against a fixture project; contracts validate end-to-end

## Phase 5: Verification

- [ ] Task: `npm run test` — all tests pass (pivot + frontend)
- [ ] Task: `npm run check` — lint + typecheck clean
- [ ] Task: Coverage on new validator module ≥ 80% (per feature threshold)
- [ ] Task: Update plan.md, log deviations, commit
