# Test Strategy: Auth Config and Identity

## 0. Pre-Flight Reality Check (read before writing any test)

`build-graph` + a live `bun test` run reveal the plan/spec premises are stale at HEAD:

- `convex/auth.config.ts` **already exists** and exports a valid provider config.
- `resolveActor` (`convex/lib/auth.ts:16`) **already** throws `Authentication required` when `NODE_ENV==='production'` and falls back to anonymous only otherwise.
- `convex/lib/auth.test.ts` **already passes 3/3** under `bun:test`, covering the same three cases Phase 1 wants to add.
- The plan's Red command `bun test ./convex/auth.test.ts` matches **no file** — bun prints `Test filter ... had no matches` and exits non-zero for the wrong reason (filter miss, not a real assertion failure). This is not a valid Red.
- 20+ Convex modules (`audit.ts`, `issues.ts`, `abTests.ts`, `reconciliationDecisions.ts`, `notifications.ts`, …) already `await resolveActor(ctx)` before mutating — blast radius is wide but the contract being added (throw on unauth in prod) is already met.

**Implication for the Tech Lead:** Phase 1 cannot be a real Red until we either (a) tighten the contract (e.g., remove the dev fallback entirely, require provider env vars at module load, assert config shape) or (b) add new assertions not yet covered (e.g., `auth.config.ts` rejects missing `domain`/`applicationID`, protected mutation rejects unauth caller end-to-end). Strategy below assumes route (a)+(b): we strengthen the contract so the existing implementation legitimately fails until updated.

## 1. Testing Pyramid Per Phase

- **Phase 1 (Red, unit-heavy):** new assertions in `convex/lib/auth.test.ts` + a new `convex/auth.config.test.ts` (contract test on the exported config object). Pure unit, `bun:test`, no Convex runtime.
- **Phase 2 (Green, same unit suite):** no new tests; flip Reds to Green by editing `auth.config.ts` and `lib/auth.ts`. Bounded smoke: re-run the exact two test files.
- **Phase 3 (Verify, narrow integration):** **one** integration test that imports a real Convex query/mutation handler (e.g., `convex/issues.ts:listIssues`) and invokes it with `createMockCtx` (`convex/__fixtures__/foundation.ts`) configured for an unauthenticated identity under `NODE_ENV='production'`. Assert it rejects. Plus typechecks across pivot/frontend as static guards. No e2e is added — Playwright is out of scope.

## 2. Shared Fixtures and Mocks

- `createCtx(identity)` helper already in `convex/lib/auth.test.ts` — promote to `convex/__fixtures__/auth.ts` and reuse from new tests.
- `convex/__fixtures__/foundation.ts:createMockCtx` for the Phase 3 integration test (already supports table chains; extend `ctx.auth.getUserIdentity` via a thin wrapper, do not modify the fixture file).
- A `withNodeEnv(value, fn)` helper (new, colocated in `convex/__fixtures__/auth.ts`) to scope env mutations and restore in `afterEach` — replaces ad-hoc `process.env.NODE_ENV = …` patterns.
- Provider-env fixture: `withAuthEnv({ domain, applicationID })` that sets/unsets `CONVEX_AUTH_PROVIDER_DOMAIN` and `CONVEX_AUTH_APPLICATION_ID` for `auth.config.ts` contract tests.

## 3. Cross-Phase Edge Cases and Dependencies

- Anonymous fallback must be **opt-in via env flag** (e.g., `FLEET_ALLOW_ANON_BOOTSTRAP=1`) rather than implicit-on-non-production, otherwise CI (which is not `NODE_ENV=production`) silently allows anonymous.
- `auth.config.ts` defaults (`http://localhost:5173`, `fleet-commander`) must not satisfy production — Phase 1 asserts production loading throws when env vars are unset.
- `tokenIdentifier` vs `subject`: `resolveActor` returns `identity.tokenIdentifier` as `subject`. Tests must pin this mapping; downstream audit/issues callers depend on it.
- 20+ existing call sites already `await resolveActor(ctx)` — changing the **return shape** is High blast radius; only the **error path** is changing. Strategy keeps `FleetActor` type stable.
- TD-201 wording is stale; Phase 3 closeout must rewrite it before marking resolved (the literal claim "`auth.config.ts` missing" is no longer true).

## 4. Architecture Guardrails

- Tests live **next to source** (`convex/lib/auth.test.ts`, `convex/auth.config.test.ts`) per repo convention. Do **not** create `convex/auth.test.ts` — fix the plan's command instead.
- Use `bun:test` (not Vitest) in `convex/` — that is the established runner for this package.
- No new HTTP/server boot; Phase 3 integration test runs **in-process** via direct handler import + mock ctx. Anything heavier belongs in a future track.
- Do not import from `convex/_generated/*` in tests beyond what `lib/auth.ts` already does (type-only imports).
- No production code is allowed to read `process.env.NODE_ENV` to **relax** auth — only to enable an explicit dev opt-in flag.

## 5. Per-Phase Test Approach

- **Phase 1 — Red (artifact + behavior contracts):**
  - `convex/auth.config.test.ts` (new, artifact contract): import the default export; assert it has a non-empty `providers` array; assert that with `CONVEX_AUTH_PROVIDER_DOMAIN`/`CONVEX_AUTH_APPLICATION_ID` unset under `NODE_ENV=production`, loading the module **throws** or the resolved provider entries do **not** equal the localhost defaults. (Today the defaults silently apply — this is the genuine Red.)
  - `convex/lib/auth.test.ts` (extend, live behavior): add a case that under `NODE_ENV !== 'production'` **without** `FLEET_ALLOW_ANON_BOOTSTRAP=1`, anonymous is **rejected**. Today it is allowed → genuine Red.
  - Record Red count from the two-file targeted run.
- **Phase 2 — Green:** Implement the production env-var assertion in `auth.config.ts`; add the opt-in flag check in `resolveActor`; rerun the same two files only.
- **Phase 3 — Verify:** Add `convex/issues.auth.test.ts` (or similar) that imports a handler and asserts unauth rejection via mock ctx; run typechecks; `build-graph update` the three touched files; rewrite TD-201 entry and mark resolved.

## 6. Build-Graph Findings That Shaped the Strategy

- `build-graph search auth` → `auth.config.ts` and `lib/auth.ts` are both present (contradicts spec premise).
- `build-graph callers resolveActor` → zero `calls` edges (the graph does not currently track these as call edges), but `grep` shows 20+ importers across `convex/*.ts`. Strategy treats `resolveActor` as **high blast radius**, justifying the single Phase 3 integration probe rather than per-caller smoke.
- `build-graph stats` → 666 files, `auth.ts` is the 3rd-most-imported file (39 imports). Confirms guardrail: signature must remain additive.
- No callers via `build-graph` means post-edit `build-graph update` is **mandatory** to re-extract import edges for both files.

## 7. Live-Proof Plan (Red → Green → Closeout)

| Phase | Targeted Red command (must fail at HEAD) | Green / closeout gate (must pass post-edit) | Live or artifact? |
| --- | --- | --- | --- |
| 1 | `bun test ./convex/lib/auth.test.ts ./convex/auth.config.test.ts` | n/a (Red phase) | **Live behavior** (assertions execute real `resolveActor` and import real `auth.config.ts`). |
| 2 | n/a | `bun test ./convex/lib/auth.test.ts ./convex/auth.config.test.ts` → all green | **Live behavior.** |
| 3 | n/a | `bun test ./convex/lib/auth.test.ts ./convex/auth.config.test.ts ./convex/issues.auth.test.ts && bun --cwd pivot typecheck && bun --cwd frontend typecheck` | Test run = **live behavior** (handler invoked with mock ctx); typechecks = **artifact/contract**. |

**Plan-command fix required:** update `plan.md` Phase 1/2 commands from `bun test ./convex/auth.test.ts` to the two-file form above. The current command produces a filter-miss exit code that **looks like** a Red but is not a real assertion failure — exactly the "fall through into a full suite unexpectedly" failure mode to avoid.

**Live vs. artifact split:** `auth.config.test.ts` is a hybrid — it is a contract test on a static config artifact, but executes real module loading and provider-env logic, so it counts as live. Pivot/frontend `typecheck` are artifact gates only and never substitute for the `bun test` run.

**No fake harnesses are used.** All gates above invoke `bun:test` against real code paths. If a future task needs a Convex runtime harness, it must declare a bounded smoke (single handler, single assertion) and never `bun test` the whole `convex/` tree as a substitute.

## 8. Intentionally-Red Files and Aggregate-Suite Hygiene

- New Phase 1 test files (`convex/auth.config.test.ts`, the extended cases in `convex/lib/auth.test.ts`) **will be discovered** by any future aggregate `bun test ./convex` run during the Red window.
- Repo-level `npm test` aliases to `bun run --cwd pivot test` and does **not** sweep `convex/`, so CI is not at risk. Confirmed by inspection of root `package.json`.
- Owner of the intentional Red: the in-progress `[~]` Phase 1 tasks in this track. They must transition to Phase 2 within the same working session; if a handoff is needed, the developer must mark the new assertions with `it.skip` referencing this track ID until Phase 2 starts, rather than leaving them red across a checkpoint.
- No other suite (pivot, frontend, e2e) imports from `convex/lib/auth.ts` test files, so Red bleed is contained.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: auth_config_identity_20260622
phase: track setup
commits: none
tests_run: bun test ./convex/lib/auth.test.ts -> 3 pass / 0 fail (read-only diagnostic); bun test ./convex/auth.test.ts -> filter miss (no matches), exposes broken plan command
files_changed: measure/tracks/auth_config_identity_20260622/test-strategy.md (new)
plan_updates: none written; strategy flags that plan.md Phase 1/2 commands point at a nonexistent file (./convex/auth.test.ts) and that spec/TD-201 premises are stale (auth.config.ts exists, prod gate already present). Recommend Implementer fix the plan command to the two-file form and rewrite TD-201 before closeout.
known_failures: none in repo at HEAD; intentional Reds will be introduced by Phase 1 in convex/lib/auth.test.ts and a new convex/auth.config.test.ts
handoff: Implementer must (1) update plan.md Red/Green commands to `bun test ./convex/lib/auth.test.ts ./convex/auth.config.test.ts`, (2) tighten contracts (production env-var assertion in auth.config.ts; explicit FLEET_ALLOW_ANON_BOOTSTRAP opt-in in resolveActor) so Reds are genuine, (3) add Phase 3 integration test via convex/__fixtures__/foundation.ts createMockCtx, (4) run build-graph update on convex/auth.config.ts and convex/lib/auth.ts post-edit, (5) rewrite the stale TD-201 entry before marking it resolved.
END_MEASURE_AGENT_RESULT
