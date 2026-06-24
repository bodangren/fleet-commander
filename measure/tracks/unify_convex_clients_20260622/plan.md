# Plan: Unify Convex Clients

> **Status note:** the track's premise — that `pivot/src/convexClient.ts`
> and `pivot/src/typedConvexClient.ts` exist in parallel — is **not**
> true at HEAD. The deprecated `typedConvexClient.ts` is already absent
> and all 30+ callers in `pivot/src/` already import from `../convexClient`.
> The track's job became **proving and recording** the unification with
> contract tests rather than performing new code work. Phase 2 is a
> no-op commit (the merge already happened prior to the track).

## Phase 1: Red — Prove Parallel Client Drift

- [x] Task: Add a failing contract test asserting only one canonical client module exists. (09cbc98 — `pivot/src/convexClient.unify.test.ts` Phase 1 Task 1)
- [x] Task: Add a failing static-import test listing callers of the deprecated client path. (09cbc98 — recursive glob over `pivot/src` filters every `typedConvexClient` reference; Phase 1 Task 2 + `convexClient.*` import count)
- [x] Task: Add a failing behavior test that the canonical client supports the same mock injection and error handling. (09cbc98 — Phase 1 Task 4 stub-client routing tests for `typedQuery` / `typedMutation` / `dynamicConvexCall`; Phase 1 Task 5 type-inference + signature-arity assertions; `@ts-expect-error` guards for string-literal rejection)
- [x] Task: Record the Red failure count. (09cbc98 — baseline `bun --cwd pivot test`: 1809 pass / 4 skip / 0 fail / 4638 expect / 153 files; after adding `convexClient.unify.test.ts`: 1835 pass / 4 skip / 0 fail / 4682 expect / 154 files; Green-on-first-run because the unification is already real at HEAD)

**Targeted Red command:**
```bash
bun --cwd pivot test src/convexClient.unify.test.ts
```

**Result at HEAD:** 26 pass / 0 fail / 44 expect (Green-on-first-run; the unification is already real, so the Red contract tests pass without any source change).

## Phase 2: Green — Merge and Migrate

- [x] Task: Merge the two implementations into the canonical typed client module. (commit: no-op — `typedConvexClient.ts` was already absent at HEAD; the canonical `convexClient.ts` already exports `api`, `typedQuery`, `typedMutation`, `dynamicConvexCall`, `createConvexClient`, `getConvexUrl` and uses typed `api.*` references throughout)
- [x] Task: Migrate all imports across `pivot/src/` to the canonical module. (commit: no-op — `grep -rn "from '\.\.?\/typedConvexClient'" pivot/src/` returns zero matches; all 30+ callers already import from `'../convexClient'` or `'./convexClient'`)
- [x] Task: Preserve mock-client injection and environment-selection behavior. (commit: no-op — `convexClient.test.ts` and the new `convexClient.unify.test.ts` Phase 1 Task 4 both exercise the stub-client routing paths with the same `{ query, mutation }` shape; tests still pass)
- [x] Task: Re-run Red tests; expect them to pass. (09cbc98 — `bun --cwd pivot test src/convexClient.unify.test.ts` reports 26 pass / 0 fail / 44 expect; pivot full suite 1835 pass / 4 skip / 0 fail)

**Targeted Green command:**
```bash
bun --cwd pivot test src/convexClient.unify.test.ts
```

**Result:** 26 pass / 0 fail / 44 expect. No source change required.

## Phase 3: Remove Deprecated Module and Close Gates

- [x] Task: Delete the deprecated client file once all imports are migrated. (commit: no-op — `ls pivot/src/typedConvexClient.ts` already returns "No such file or directory"; 0 source references in `pivot/src`, `convex/`, or `frontend/src/`; only references are in `measure/archive/` historical documents)
- [x] Task: Run `bun --cwd pivot test` and `bun --cwd pivot typecheck`. (09cbc98 — `bun --cwd pivot test`: 1835 pass / 4 skip / 0 fail / 4682 expect / 154 files; `bun --cwd pivot typecheck`: clean, 0 errors)
- [x] Task: Run `build-graph update ./graph.db <changed files>`. (5bb35bd — `build-graph update ./graph.db pivot/src/convexClient.unify.test.ts pivot/src/convexClient.ts` updated 2 files (18 → 24 nodes, 48 → 29 edges))
- [x] Task: Update `measure/tech-debt.md` to mark TD-204 resolved. (b6093e1 — TD-204 moved from Open to Resolved with commit SHAs and acceptance evidence)

**Closeout command:**
```bash
bun --cwd pivot test && bun --cwd pivot typecheck
```

**Final closeout evidence:**
- `bun --cwd pivot test src/convexClient.unify.test.ts`: 26 pass / 0 fail / 44 expect
- `bun --cwd pivot test` (full suite): 1835 pass / 4 skip / 0 fail / 4682 expect / 154 files
- `bun --cwd pivot typecheck`: clean (exit 0)
- `pivot/src/typedConvexClient.ts`: absent (verified `existsSync(...) === false`)
- 0 callers in `pivot/src/`, `convex/`, or `frontend/src/` reference `typedConvexClient`
- graph.db updated incrementally for `pivot/src/convexClient.unify.test.ts` and `pivot/src/convexClient.ts` (5bb35bd)
- TD-204 moved to Resolved with full evidence chain (b6093e1)