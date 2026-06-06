# Plan: Typed Convex API Boundary

> Sequenced after review_remediation Phase 3 (TD-236): the as-any guard must
> read its allowlist before allowlist removals here can be verified.

## Phase 1: Inventory & Wrapper Design

> **REOPENED 2026-06-07 (review):** Phase 1 was marked complete in `ab8db9f`,
> but `bun --cwd pivot typecheck` **fails at HEAD** with 4 errors in
> `pivot/src/convexClient.test.ts` — the Phase 1 type-test file does not
> compile, so Task 3's acceptance ("type tests proving args/returns are
> inferred… no `as any`") is unmet. Critically, `convexClient.test.ts:204`
> reports `TS2578: Unused '@ts-expect-error'` — the test that proves the
> wrapper **rejects string literals** is dead, meaning `dynamicConvexCall`'s
> core safety guarantee is NOT actually enforced by the type system. Lines
> 139/164 (`.toBe('query-result')` vs the typed return) and 207 (string
> passed where `FunctionReference` is required) are the other 3 errors.
> Until these compile, the whole pivot typecheck gate is red.

- [x] Task: Grep pivot + frontend for `.query('` / `.mutation('` string-based Convex calls and every Convex-related `as any`; tabulate call site → target Convex fn → args/return types. (`ab8db9f`)
- [x] Task: Identify call sites that can use `typedQuery`/`typedMutation` + `api.*` directly vs. those needing a thin generic wrapper (e.g. dynamic fn selection); design the minimal wrapper API. (`ab8db9f`)
- [ ] Task: Write the wrapper (if needed) with type tests proving args/returns are inferred from `api.*` (no `as any`). **Acceptance not met (`ab8db9f`):** `pivot/src/convexClient.test.ts` fails `bun --cwd pivot typecheck` (4 errors at lines 139, 164, 204, 207). Fix so (a) the file compiles, (b) the `@ts-expect-error` at :204 is *triggered* (tighten `dynamicConvexCall`'s signature so a string literal is rejected at compile time), and (c) the stub-return assertions at :139/:164 type-check. Verify `bun --cwd pivot typecheck` exits 0.

## Phase 2: Migrate Pivot Routes
- [~] Task: Red phase — add typed-path migration tests for `retrospectives`, `performance`, `costs`, `pipelines`, and `retrospective/scheduler` (parallel to the existing analytics `Phase 2 Red` block); confirm new tests fail for the expected missing typed-path behavior.
- [ ] Task: Migrate `pivot/src/routes/**` string-based Convex calls to the typed path, one route file per commit; delete the matching `as any` casts.
- [ ] Task: Per file: run `bun --cwd pivot typecheck` + route tests; fix any contract mismatch the types now reveal (these are real bugs — do not re-cast).
- [ ] Task: `build-graph update` after each migrated file.

## Phase 3: Migrate Frontend Convex Calls
- [ ] Task: Migrate remaining frontend string-based Convex calls / casts (`convex-data`, hooks) to the typed path.
- [ ] Task: `bun --cwd frontend test` + `check` green per file.

## Phase 4: Tighten the Gate
- [ ] Task: Remove the `pivot/src/routes/**/*.query(` / `.mutation(` and "Convex ID type coercion" globs from `as-any-allowlist.txt`; leave only a small named residue if truly unavoidable (documented with TD ids).
- [ ] Task: `doctor.sh as-any` count drops to the residue only; negative-test that a new string-based Convex `as any` now FAILs.
- [ ] Task: Full suites + typecheck + `doctor.sh all` green; `build-graph` updated.
- [ ] Task: Commit and push.
