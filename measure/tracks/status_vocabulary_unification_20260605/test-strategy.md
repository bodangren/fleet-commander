# Test Strategy: Status & Enum Source-of-Truth Unification

Tech Lead guidance for the four phases in `plan.md`. Optimised for the structural reality surfaced by `build-graph`: validators are a 138-line hub imported by 3 files today but consumed indirectly by ~30 files that re-declare overlapping unions. Drift, not algorithmic complexity, is the risk — so tests must lock the *shape* of every vocabulary, not its behaviour.

## 1. Testing Pyramid Per Phase

| Phase | Unit | Integration | E2E |
|---|---|---|---|
| 1 Inventory & Contract | n/a — produces a doc artifact; verify via doctor static check in P4 | n/a | n/a |
| 2 Consolidate Validators | **Heavy** — one `validators.test.ts` case per vocabulary (literal set + display-map parity) | Light — schema import smoke (`bun --cwd pivot typecheck`, `bunx convex codegen`) | none |
| 3 Provider health split (TD-235) | Validator export test (extend existing `providerHealthValidator.test.ts`) | `convex-test` against `updateProviderHealth` + `getProviderHealth`; migration backfill idempotency test | One Playwright check that `ProviderCard` renders all 3 health badges |
| 4 Guard & Verify | Doctor check unit test with positive + **negative** fixture | Full `doctor.sh all`, all `bun test` suites, `bun --cwd pivot typecheck` | none |

Rule: every literal added to a validator must add **one** unit-test line, not a new test file.

## 2. Shared Fixtures & Mocks

- Reuse existing `convex/__fixtures__/foundation.ts` and `history.ts` for status fixtures; do **not** create parallel fixtures. After Phase 2 these fixtures must import the canonical TS types (compile-time guard).
- Add `convex/lib/__fixtures__/vocabularies.ts` exporting `{ validator, expectedValues, displayMap? }` tuples consumed by both `validators.test.ts` and the Phase 4 doctor check. Single source — table-driven tests.
- Mocks: none for validators (pure data). For Phase 3 reuse the `convex-test` harness already used by `providers.test.ts` patterns; do **not** mock Convex db.
- Test runner: convex tests use `bun:test` (see `convex/providerHealthValidator.test.ts:23`); pivot/frontend use Vitest. Keep that boundary — do not introduce vitest into `convex/`.

## 3. Cross-Phase Edge Cases & Dependencies

- **Phase 2 → Phase 3 ordering:** `providerHealthStatus` already exists (validators.ts:112) and is imported by `convex/schema/agents.ts` — Phase 2 must not rename it or Phase 3's migration breaks.
- **Display-map parity drift:** `frontend/src/lib/pipelineUtils.tsx`, `OptimizePage.tsx`, `SprintPanel.tsx`, `kanban/DependencyEditor.tsx`, `providers/ProviderCard.tsx`, `DependencyGraph.tsx` each declare local `statusColors`. Parity test must cover *every* validator → *every* map that consumes it (use a registry).
- **`agentStatus` vs `agents.status` divergence:** `convex/lib/validators.ts:85` defines 4 values (`active|idle|blocked|offline`); `convex/schema/agents.ts:11` and `convex/employees.ts:12,111` inline only 2 (`active|away`). Phase 1 inventory must record this as a *semantic* conflict, not a duplication — Tech Lead decision needed before Phase 2 writes code. Add a test only after the canonical set is decided.
- **Recovery/reviewer vocabularies duplicated across files:** `convex/schema/contracts.ts:25-31` and `convex/runContracts.ts:30-36, 123, 151-154, 181` declare the same 5-value unions twice. Single Phase 2 commit must update both; add a test that imports both modules and asserts the validator reference is identical (`===`).
- **Reconciliation vocabularies triple-declared:** `convex/reconciliationEngine.ts:5-7`, `convex/reconciliationProposals.ts:5-7`, `convex/schema/operations.ts:77,79,95,97` — three files. Use a single `validators.test.ts` case to lock the canonical set; doctor check (P4) will flag regressions.
- **Backfill idempotency (Phase 3):** `convex/providers.ts:282-294` already exists. Test must run the backfill twice and assert no second write.
- **Negative doctor test (Phase 4):** add a fixture file under `tests/fixtures/bad_schema.ts` with `v.union(v.literal('x'),v.literal('y'))` inline and assert the doctor check returns non-zero.

## 4. Architecture Guardrails

- **Contract-first:** Phase 1's inventory table is the contract. No code in Phase 2 without it committed.
- **One-place change rule:** after Phase 2 a new status value must touch ≤ 2 files (validator + display map). Doctor check enforces.
- **No new tests in convex use Vitest** — `bun:test` only, matching `convex/providerHealthValidator.test.ts`.
- **No new files in `convex/lib/`** beyond `validators.ts` + `__fixtures__/vocabularies.ts`. Resist the urge to create `enums/` or per-vocabulary modules.
- **Validators are pure** — no imports beyond `convex/values`. The `inspect` shows 0 outgoing edges today; keep it that way.
- **Frontend imports types only, never validators** (validators are server-side). Display maps must be keyed off the derived TS union via `satisfies Record<StatusType, X>` — locks parity at compile time.
- **`agentStatus` decision** must be cross-referenced in `spec.md` Out of Scope or as a new acceptance criterion before Phase 2.

## 5. Per-Phase Test Approach Notes

- **Phase 1:** No automated tests. Deliverable is a markdown table in this directory (`inventory.md`) listing vocabulary → definition site(s) → consumers → canonical decision. Use `build-graph query` outputs (see §6) as ground truth — don't hand-grep.
- **Phase 2:** Write `convex/lib/validators.test.ts` (bun:test) before refactoring each vocabulary (Red). Table-driven from `vocabularies.ts` fixture: assert literal set, assert derived TS type compiles (`type X = typeof vocab[number]`), assert display-map keys === literal set. Run after each replacement of an inline union (Green).
- **Phase 3:** Extend `convex/providerHealthValidator.test.ts`; add `convex/providers.test.ts` cases for `updateProviderHealth` writing `healthStatus` and `getProviderHealth` returning both fields. Add a `convex/providersBackfill.test.ts` case for idempotent migration. Frontend: snapshot `ProviderCard` with all three health states.
- **Phase 4:** Build the doctor check as a standalone script `measure/doctor/checks/status_vocabulary.sh` invoked by `measure/doctor.sh`. Unit-test it with positive (clean schema) and negative (planted inline union) fixtures. Final gate: full suites + typecheck + doctor green.

## 6. Build-Graph Findings That Shaped This Strategy

- `graph.db` fresh (mtime today, 4723 nodes / 628 files). No re-scan needed.
- `inspect validators.ts` → 0 outgoing edges, only 3 incoming (`agents.ts`, `projects.ts`, `providerHealthValidator.test.ts`). **Implication:** 90%+ of duplicated unions in the inventory are *not* yet importing validators — Phase 2 will multiply the incoming-edge count ~10×. Re-run `build-graph update graph.db convex/lib/validators.ts <each-touched-file>` after every Phase 2 commit so blast-radius stays accurate.
- `callers updateProviderHealth` / `getProviderHealth` → 0 callers in graph. **Implication:** they are Convex generated-API consumers (frontend uses `useQuery(api.providers.getProviderHealth)`), invisible to the AST graph. Tests must exercise them via the `convex-test` harness, not via static caller analysis.
- `query nodes WHERE name LIKE '%.status'` → 10 schema status fields across pivot + convex fixtures + frontend `pipelineUtils.tsx`. **Implication:** parity tests must cover both `pivot/src/pipeline/types.ts` and `pivot/src/shared/runContract.ts` Zod schemas (separate vocabulary system) — these are **out of scope** for this track (Zod, not Convex validators), but call this out in Phase 1 inventory to prevent confusion.
- `grep v.union(v.literal` → **80 matches across 28 files**. Confirms the spec's "several are defined as inline … in multiple places" and sizes the Phase 2 surface area. The doctor check in Phase 4 is non-negotiable: without it, regression is inevitable at this scale.
- Doctor script lives at `measure/doctor.sh`, not project root (correcting plan Phase 4 assumption).
