# Plan: Fix Coverage Query Performance (TD-015)

## Phase 1: Fix getCoverageHistory query
- [ ] Change `ctx.db.query('coverageRecords').collect()` + filter to `ctx.db.query('coverageRecords').withIndex('by_project_and_date', (q) => q.eq('projectSlug', args.projectSlug)).order('desc').take(limit)`

## Phase 2: Fix getLatestCoverage query  
- [ ] Change `ctx.db.query('coverageRecords').filter().collect()` + sort to `ctx.db.query('coverageRecords').withIndex('by_project_and_date', (q) => q.eq('projectSlug', args.projectSlug)).order('desc').first()`

## Phase 3: Regenerate Convex API types
- [ ] Run `npx convex dev` to regenerate `_generated/api.d.ts`
- [ ] Verify `coverageRecords` module appears in fullApi

## Phase 4: Verify
- [ ] Run tests: `npm run test` (or `npm run test:main` if only main tests)
- [ ] Run lint + typecheck: `npm run check`
- [ ] Commit with note about TD-015