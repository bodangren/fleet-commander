# Implementation Plan — Harness Capability Schema (A2)

## Phase 1: Extended YAML Schema

- [ ] Task: Write failing tests for `HarnessProfile` Zod schema (valid, missing-capabilities, invalid-enum fixtures)
- [ ] Task: Define `HarnessProfile` schema in `src/shared/harnessProfile.ts` covering invocation + capabilities + policy
- [ ] Task: Tests pass

## Phase 2: Update opencode.yaml

- [ ] Task: Add `capabilities` block to `conductor/harnesses/opencode.yaml` with documented values
- [ ] Task: Add `policy` block with defaults (allowed_task_classes, concurrency_limit, etc.)
- [ ] Task: Validate file parses against schema

## Phase 3: Convex Persistence

- [ ] Task: Write failing tests for `harnessProfiles` mutations/queries
- [ ] Task: Add `harnessProfiles` table to `convex/schema.ts` indexed by `name`
- [ ] Task: Implement `convex/harnessProfiles.ts`: `upsertProfile`, `getProfile`, `listProfiles`
- [ ] Task: Regenerate Convex API types
- [ ] Task: Tests pass

## Phase 4: Loader + File Watch

- [ ] Task: Write failing integration tests: load valid YAML, invalid YAML (defaults applied), edit triggers re-upsert
- [ ] Task: Implement `pivot/src/harness/loader.ts` with `loadAllHarnesses()` and watch integration
- [ ] Task: Wire loader into pivot server startup
- [ ] Task: Tests pass

## Phase 5: Verification

- [ ] Task: `npm run test` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80% on new modules
- [ ] Task: Commit + plan update
