# Implementation Plan — Reconciliation Event Logging (A4)

## Phase 1: Markdown Normalization

- [x] Task: Write failing tests for `normalizeMarkdown` across 10 divergence fixtures
- [x] Task: Add `remark-parse` + `mdast-util-to-string` deps via `bun add`
- [x] Task: Implement `pivot/src/reconciliation/hash.ts`
- [x] Task: Tests pass

## Phase 2: Convex Schema

- [x] Task: Write failing tests for `reconciliationEvents` mutations/queries (insert, dedup, bump counter)
- [x] Task: Add table + indexes to `convex/schema.ts`
- [x] Task: Implement `convex/reconciliationEvents.ts` with `recordDivergence`, `listRecent`, `getDivergences`
- [x] Task: Regenerate Convex API types (manual update to api.d.ts due to offline)
- [x] Task: Tests pass

## Phase 3: Differs (TDD, one per artifact class)

- [x] Task: Write failing tests for `taskDiffer`
- [x] Task: Implement `pivot/src/reconciliation/differs/task.ts`
- [x] Task: Write failing tests for `trackMetadataDiffer`
- [x] Task: Implement `trackMetadata.ts`
- [x] Task: Write failing tests for `issueDiffer`
- [x] Task: Implement `issue.ts`

## Phase 4: Sweep + Route

- [x] Task: Write failing integration test: sweep detects injected divergence
- [x] Task: Implement `runReconciliationSweep()` composing all differs
- [ ] Task: Add `POST /reconcile/scan` route + 5-min interval (deferred - requires routing infra)
- [ ] Task: Perf test: 100 tracks / 500 tasks < 500ms (deferred)
- [x] Task: Tests pass

## Phase 5: Verification

- [x] Task: `npm run test` all pass (346 pivot tests)
- [x] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Commit + plan update
