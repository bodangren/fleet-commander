# Plan: Typed Convex API Boundary

> Sequenced after review_remediation Phase 3 (TD-236): the as-any guard must
> read its allowlist before allowlist removals here can be verified.

## Phase 1: Inventory & Wrapper Design
- [x] Task: Grep pivot + frontend for `.query('` / `.mutation('` string-based Convex calls and every Convex-related `as any`; tabulate call site → target Convex fn → args/return types. (`ab8db9f`)
- [x] Task: Identify call sites that can use `typedQuery`/`typedMutation` + `api.*` directly vs. those needing a thin generic wrapper (e.g. dynamic fn selection); design the minimal wrapper API. (`ab8db9f`)
- [x] Task: Write the wrapper (if needed) with type tests proving args/returns are inferred from `api.*` (no `as any`). (`ab8db9f`)

## Phase 2: Migrate Pivot Routes
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
