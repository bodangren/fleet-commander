# Implementation Plan — Harness Capability Schema (A2)

## Phase 1: Extended YAML Schema

- [x] Task: Write failing tests for `HarnessProfile` Zod schema (valid, missing-capabilities, invalid-enum fixtures)
- [x] Task: Define `HarnessProfile` schema in `src/shared/harnessProfile.ts` covering invocation + capabilities + policy
- [x] Task: Tests pass

## Phase 2: Update opencode.yaml

- [x] Task: Add `capabilities` block to `measure/harnesses/opencode.yaml` with documented values
- [x] Task: Add `policy` block with defaults (allowed_task_classes, concurrency_limit, etc.)
- [x] Task: Validate file parses against schema

## Phase 3: Convex Persistence

- [x] Task: Write failing tests for `harnessProfiles` mutations/queries
- [x] Task: Add `harnessProfiles` table to `convex/schema.ts` indexed by `name`
- [x] Task: Implement `convex/harnessProfiles.ts`: `upsertProfile`, `getProfile`, `listProfiles`
- [x] Task: Regenerate Convex API types (manual update to api.d.ts due to offline environment)
- [x] Task: Tests pass

## Phase 4: Loader + File Watch

- [x] Task: Write failing integration tests: load valid YAML, invalid YAML (defaults applied), edit triggers re-upsert
- [x] Task: Implement `pivot/src/harness/loader.ts` with `loadAllHarnesses()` and watch integration
- [ ] Task: Wire loader into pivot server startup (deferred - requires Convex mutation calling infrastructure)
- [x] Task: Tests pass

## Phase 5: Verification

- [x] Task: `npm run test` all pass (316 pivot tests)
- [x] Task: `npm run check` clean (typecheck passes)
- [x] Task: Coverage ≥ 80% on new modules (loader.ts: 83.33% funcs / 93.18% lines)
- [x] Task: Commit + plan update
