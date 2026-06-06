/**
 * Test fixture: planted inline `v.union(v.literal(...))` for the
 * status-vocabulary doctor check.
 *
 * Consumed by `measure/doctor/checks/status_vocabulary.test.ts` (Phase 4,
 * Guard & Verify). The test copies this file into a temporary directory
 * and points the doctor check at the temp dir. The check MUST exit
 * non-zero and report `bad_schema.ts` as the offending file.
 *
 * Per `test-strategy.md` §3 (Phase 4): "add a fixture file under
 * `tests/fixtures/bad_schema.ts` with `v.union(v.literal('x'),v.literal('y'))`
 * inline and assert the doctor check returns non-zero."
 *
 * DO NOT refactor the planted pattern, rename the file, or move it to a
 * different path — the test asserts the doctor check detects this exact
 * `v.union(v.literal(...))` shape inside `convex/schema/**` consumers.
 *
 * This file is intentionally outside `convex/`, `pivot/src/`, and
 * `frontend/src/` so it is excluded from `bun --cwd <workspace> typecheck`
 * and from the pivot/frontend test suites. It is consumed only by the
 * doctor check test.
 */

// Local `v` shim — keeps the file standalone (no `convex/values` import)
// while preserving the exact pattern the doctor check must match.
declare const v: {
  union: (...args: ReadonlyArray<{ kind: string }>) => { kind: string }
  literal: (s: string) => { kind: string; value: string }
}

const plantedBadStatus = v.union(
  v.literal('x'),
  v.literal('y'),
)

void plantedBadStatus

export {}
