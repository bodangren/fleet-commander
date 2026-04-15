# Implementation Plan — Reconciliation Event Logging (A4)

## Phase 1: Markdown Normalization

- [ ] Task: Write failing tests for `normalizeMarkdown` across 10 divergence fixtures
- [ ] Task: Add `remark-parse` + `mdast-util-to-string` deps via `bun add`
- [ ] Task: Implement `pivot/src/reconciliation/hash.ts`
- [ ] Task: Tests pass

## Phase 2: Convex Schema

- [ ] Task: Write failing tests for `reconciliationEvents` mutations/queries (insert, dedup, bump counter)
- [ ] Task: Add table + indexes to `convex/schema.ts`
- [ ] Task: Implement `convex/reconciliationEvents.ts` with `recordDivergence`, `listRecent`
- [ ] Task: Regenerate Convex API types
- [ ] Task: Tests pass

## Phase 3: Differs (TDD, one per artifact class)

- [ ] Task: Write failing tests for `taskDiffer`
- [ ] Task: Implement `pivot/src/reconciliation/differs/task.ts`
- [ ] Task: Write failing tests for `trackMetadataDiffer`
- [ ] Task: Implement `trackMetadata.ts`
- [ ] Task: Write failing tests for `issueDiffer`
- [ ] Task: Implement `issue.ts`

## Phase 4: Sweep + Route

- [ ] Task: Write failing integration test: sweep detects injected divergence
- [ ] Task: Implement `runReconciliationSweep()` composing all differs
- [ ] Task: Add `POST /reconcile/scan` route + 5-min interval
- [ ] Task: Perf test: 100 tracks / 500 tasks < 500ms
- [ ] Task: Tests pass

## Phase 5: Verification

- [ ] Task: `npm run test` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Commit + plan update
