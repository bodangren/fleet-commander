# Implementation Plan - Fix YAML Safe Schema (TD-031)

## Phase 1: Fix yaml.load() calls

- [ ] Task: Update `pivot/src/policy/allocator.ts:101` — add `{ schema: yaml.DEFAULT_SCHEMA }` to `yaml.load()`
- [ ] Task: Update `pivot/src/reconciliation/rules.ts:31` — add `{ schema: yaml.DEFAULT_SCHEMA }` to `yaml.load()`
- [ ] Task: Update `pivot/src/harness/loader.ts:16` — add `{ schema: yaml.DEFAULT_SCHEMA }` to `yaml.load()`
- [ ] Task: Update `pivot/src/pipeline/loader.ts:67` — add `{ schema: yaml.DEFAULT_SCHEMA }` to `yaml.load()`
- [ ] Task: Update `frontend/src/lib/analysis.ts:68` — add `{ schema: yaml.DEFAULT_SCHEMA }` to `yaml.load()`
- [ ] Task: Update `frontend/src/lib/coverage.ts:74` — add `{ schema: yaml.DEFAULT_SCHEMA }` to `yaml.load()`

## Phase 2: Verify

- [ ] Task: Run full test suite — `npm run test`
- [ ] Task: Run build — `npm run build`
- [ ] Task: Mark TD-031 as resolved in `conductor/tech-debt.md`
