# Test Strategy: Typed Convex API Boundary

> Sequenced after review_remediation Phase 3 (TD-236). Note: `doctor.sh::check_as_any`
> (measure/doctor.sh:107-145) **does** read `as-any-allowlist.txt` today; verify
> TD-236's actual residue with the Phase 4 negative test before assuming the gate
> is non-functional.

## 1. Testing Pyramid Per Phase

- **Phase 1 (Inventory & Wrapper Design)** — heavy **type-level + unit**. The
  inventory is a checked-in artifact (markdown table); the wrapper, if any, is
  validated by `expectTypeOf`/`tsd`-style type tests. No e2e needed.
- **Phase 2 (Migrate Pivot Routes)** — **unit + route integration**. Per-file:
  `bun --cwd pivot typecheck` is the primary contract check; existing
  `pivot/src/routes/*.test.ts` (e.g. `analytics.test.ts`, `costs.test.ts`,
  `retrospectives.test.ts`) exercise handlers with `createMockConvexClient`.
  Add tests only where coverage is missing (TD-220 territory).
- **Phase 3 (Frontend Migration)** — **unit + component**. Vitest + RTL via
  `useConvexData.test.ts` patterns; `ProjectTemplatesPage`/`ProjectViewPage` get
  RTL tests around the migrated mutations.
- **Phase 4 (Tighten the Gate)** — **doctor-script integration**. A negative
  test that plants a `client.query('x' as any, …)` under `pivot/src/routes/`
  and asserts `doctor.sh as-any` exits non-zero; a positive test confirms HEAD
  remains green after allowlist tightening.

## 2. Shared Fixtures & Mocks

- **`pivot/src/__fixtures__/convex-mock.ts::createMockConvexClient`** — already
  resolves both string paths and `{ _name }` objects (lines 147-154), so it
  works for typed `api.*` references without modification. **Do not fork.**
- **`pivot/src/convexClient.ts`** — re-uses `typedQuery`/`typedMutation`
  (lines 82-103). Tests assert these are the call sites, not the wrappers'
  internals.
- **`api` from `convex/_generated/api`** — must be imported in tests that
  exercise the typed path so the generated types travel through assertions.
- **No new global mocks.** Per lesson `(bun_mock_module)`, prefer DI; the
  scheduler's private `this.client` (retrospective/scheduler.ts:54-68) needs
  injection rather than `mock.module('../convexClient')`.

## 3. Cross-Phase Edge Cases & Dependencies

- **Dynamic function selection** (Phase 1 → 2): retrospective scheduler picks
  `'sprints:listSprints'` programmatically. Wrapper API must accept an
  `api.module.fn` reference *value*, not a string — verify with a type-only
  test that string literals are rejected.
- **`as any` on returns vs. args** (Phase 2): many call sites cast the **result**
  (`(await client.query(...)) as Array<…>`). Removing the cast may surface
  shape drift between the route's expectation and the Convex function's actual
  return — these are real bugs (per spec), fix them in-track; do **not**
  re-introduce `as any`.
- **Convex ID coercion glob** (Phase 4): the `convex/**/*:as any): Convex ID`
  allowlist entry is broader than this track owns; narrow only the
  `pivot/src/routes/**` and ID-coercion entries that this track actually
  retires.
- **TD-237 latent bugs** (`convex/lib/insights.ts:77`, `convex/projects.ts:150`)
  will likely break typecheck once string casts are removed downstream. Triage,
  don't shotgun: fix in-track only if the Convex signature is the contract; else
  spawn a sibling bug track.
- **TD-236 verification** (Phase 4 prerequisite): run
  `bash measure/doctor.sh as-any` on HEAD **before** Phase 4 to confirm
  current residue count; this is the baseline the negative test compares against.

## 4. Architecture Guardrails

- **No new `as any`** anywhere in pivot routes or frontend convex callers; the
  doctor gate enforces this after Phase 4.
- **Single typed entry point**: all Convex calls flow through
  `pivot/src/convexClient.ts` (`typedQuery`/`typedMutation` + `api`). Frontend
  uses `convexClient.query(api.*, …)` with no string identifiers.
- **Wrapper minimalism**: if a wrapper is added in Phase 1, it must take
  `FunctionReference<'query'|'mutation'>` and infer args/returns — no
  `unknown`, no defaulted generics, no string fallback.
- **No module-level mocks** of `convexClient` or `_generated/api` in tests
  (lesson `bun_mock_module`, TD-228 resolution).
- **Allowlist hygiene**: every remaining allowlist line after Phase 4 must
  cite a TD-id in its `:reason` field.

## 5. Per-Phase Test Approach Notes

- **Phase 1**: Inventory lives in this track dir as `inventory.md`. Wrapper PR
  ships with a `*.types.test.ts` using `expectTypeOf` to assert inferred
  return type equals `FunctionReturnType<typeof api.xxx.yyy>`.
- **Phase 2**: One commit per route file. Order by call-count (use
  `build-graph query` against `queries`/`mutates` edges) so high-traffic files
  like `routes/analytics.ts` (8 calls) and `routes/retrospectives.ts` (10+ calls)
  land first with the most test coverage. Run that route's `*.test.ts` +
  `bun --cwd pivot typecheck` per commit. `build-graph update` after each.
- **Phase 3**: Frontend surface is small (`ProjectTemplatesPage.tsx`,
  `ProjectViewPage.tsx`); add RTL tests covering the success path of each
  migrated mutation. `bun --cwd frontend check` per file.
- **Phase 4**: Negative test as a shell script under
  `measure/doctor/checks/typed_convex.test.sh` (or extend
  `status_vocabulary.test.ts` pattern) that uses a temp file with a planted
  cast and asserts non-zero exit + expected error substring. Final gate:
  `bash measure/doctor.sh all` + both suites + typechecks green.

## 6. build-graph Findings Shaping This Strategy

- `build-graph stats`: 4811 nodes / 6926 edges / 601 files; pivot 259, frontend
  226, convex 89. Manageable for per-file commits.
- `build-graph inspect typedQuery|typedMutation`: **zero outgoing edges, only
  param_flow + `contains` inbound** — these helpers are defined but **have no
  production callers today**. Migration is greenfield adoption, not refactor.
- `build-graph callers typedQuery` / `typedMutation`: no results — confirms the
  inventory must drive Phase 2 ordering since the graph cannot.
- `grep` baseline: **30** `.query('` + **8** `.mutation('` string-based calls,
  **143** `as any` in `pivot/src/routes/**`, **405** `as any` total. The
  191 figure in the spec is the post-`__fixtures__`/`.test.` filter; the doctor
  count is what tightens in Phase 4.
- Hotspot files (by call-site density): `pivot/src/routes/retrospectives.ts`,
  `routes/analytics.ts`, `routes/costs.ts`, `routes/performance.ts`,
  `pivot/src/retrospective/scheduler.ts` (non-route, but in scope). These
  define the Phase 2 sequence.
- Frontend scope is **2 files** (`ProjectTemplatesPage.tsx`,
  `ProjectViewPage.tsx`) — Phase 3 is small.
