# Test Strategy: Quality Workflow Hot-Path Wiring

Track: `quality_workflow_hot_path_wiring_20260618` · Tech Lead notes for the implementer.
Run all tests with `bun --cwd pivot test <files>` (Bun-native; `bunfig.toml` sets `[test].root = "pivot"`). All file paths below are repo-relative.

## 1. Build-Graph Findings That Shaped This Strategy

- `build-graph search QualityWorkflowRunner` confirms the interface lives at `pivot/src/orchestrator/qualityWorkflowRunner.ts:116` and **only test files implement it** today (matches spec evidence).
- `build-graph callers AutoRunner` / `runAutoRunner` / `runConfiguredQualityWorkflow` returned **no edges** — these are only reached via dynamic dispatch and module-load. Therefore wiring tests cannot rely on call-graph proofs; they must use real production `import` statements.
- Production hot-path is exactly two construction sites: `pivot/src/server.ts:140` (`new AutoRunner(...)`) and `pivot/src/orchestrator/autoRunner.ts:173` (`runAutoRunner`). Both currently pass `{ isEnabled, gitHooks }` only.
- `runConfiguredQualityWorkflow` throws `QualityWorkflowHooks.runner is required …` at `qualityWorkflowDispatch.ts:64` — this is the precise failure surface.
- `noSecondScheduler.test.ts` already enforces "no production file spawns `automation-supervisor.py`" (lines 175, 197). New guard work must extend that file’s ownership, not duplicate it.
- `qualityProfileParity.test.ts` already covers strict-profile end-to-end via injected `deps.runAll` — it does **not** prove production wiring (gap this track closes).

## 2. Testing Pyramid Per Phase

| Phase | Unit | Integration / Wiring | E2E |
|---|---|---|---|
| 1 Red | – | **Production-import tests** (no `deps` injection) for `server.ts` and `runAutoRunner` | – |
| 2 Production Runner | New unit tests for the runner factory: stage exec → status/duration/stdout/stderr capture, fail-closed on missing harness | Reuse existing `qualityWorkflowRunner.*.test.ts` patterns | – |
| 3 Hot-Path Wiring | – | Convert Phase-1 reds to green by importing the factory; extend `noSecondScheduler` guard | Single bounded smoke that constructs the real `AutoRunner` and runs **one** none-profile tick |
| 4 Verification | – | Targeted file list (see §7) | – |

## 3. Shared Fixtures & Mocks

- **Reuse `pivot/src/orchestrator/__fixtures__/`** for project/config shapes.
- **`mock.module('./qualityWorkflowDispatch', …)`** is the established pattern in `autoRunner.qualityWiring.test.ts` (Bun `mock`) — keep it for runner-plumbing assertions.
- **No new fakes for the production runner.** Phase 2 tests must drive the real factory with a stubbed harness invoker (process-level fake, not a `QualityWorkflowRunner` fake) so the runner code path is genuinely exercised.
- **Harness boundary stub**: extend the fixture pattern from `harnessProfile.test.ts`; do not invent a new boundary.

## 4. Cross-Phase Edge Cases & Dependencies

1. `none` profile must still skip `runConfiguredQualityWorkflow` entirely (regression risk; covered by `qualityProfileParity - no-profile production regression`).
2. Continuous-mode toggle off: `isEnabled() === false` must short-circuit *before* the runner is built (cheap construction, lazy run).
3. Git-hook auto-push must continue to thread through unchanged.
4. Phase 2 → 3 dependency: factory signature must be stable before `server.ts` imports it — author the factory’s exported type first, commit, then wire.
5. Resume + cost rollup paths (`qualityResume.integration.test.ts`, `qualityCostRollup.test.ts`) must remain green; the runner must persist stage attempts via the **existing** Convex quality-run API, not a parallel path.
6. Closeout eligibility short-circuit (Phase 3 of `qualityWorkflowRunner.phase3.test.ts`) must remain authoritative.

## 5. Architecture Guardrails

- **Single scheduler / single claimant**: do not weaken `pivot/src/orchestrator/guards/noSecondScheduler.test.ts`. Add an assertion there that the production hook factory is imported by `server.ts` AND `autoRunner.ts` — not a new guard file.
- **No `*.fake.ts` / `*.stub.ts` imports from production** (already enforced; keep clean).
- **Production must not import or spawn `measure/automation-supervisor.py`** — already enforced by line-176/198 assertions; the new factory must not touch that path.
- **Fail-closed preserved**: missing/misconfigured harness → operational error with stage attempt recorded; **never** silent pass.
- **No second hook factory.** One exported `createProductionQualityWorkflowHooks` (or equivalent) used by both call sites. Phase-3 guard test asserts referential identity of the import.

## 6. Per-Phase Test Approach Notes

- **Phase 1 (Red)** — Two new tests under `pivot/src/orchestrator/`:
  (a) `server.qualityWiring.test.ts` — uses `import('../server')` is too heavy; instead read the source via `readFileSync` + a structural assertion *and* a runtime assertion that the exported factory module exists. Prefer the runtime: `await import('./productionQualityWorkflowHooks')` and assert the symbol it exports is referenced from `server.ts` AST tokens. This is a **contract test on the wiring shape**, paired with (b).
  (b) `autoRunner.runEntrypoint.qualityWiring.test.ts` — calls `runAutoRunner` with a single-tick harness, asserts the `AutoRunner` constructed inside receives a non-empty `qualityWorkflowHooks.runner`. Live behavior, bounded.
- **Phase 2 (Runner)** — TDD per AC #3: one test per captured field (status, duration, stdout, stderr, attempt index, failure reason); fail-closed test for missing harness; preserves AC #8.
- **Phase 3 (Wiring)** — Flip Phase-1 reds green; add the `noSecondScheduler` extension assertion; add a non-none fixture proving executor → quality workflow → reviewer/merger continuation (AC #7).
- **Phase 4 (Verification)** — Run the focused list, then the full `bun --cwd pivot test` once as a regression net.

## 7. Live-Proof Plan (Red → Green Gates)

| Phase | Targeted Red command | Green / closeout gate |
|---|---|---|
| 1 | `bun --cwd pivot test src/orchestrator/autoRunner.runEntrypoint.qualityWiring.test.ts src/orchestrator/server.qualityWiring.test.ts` | Same command passes after Phase 3 |
| 2 | `bun --cwd pivot test src/orchestrator/productionQualityWorkflowHooks.test.ts` | Same command passes; coverage ≥ 80% on new file |
| 3 | `bun --cwd pivot test src/orchestrator/guards/noSecondScheduler.test.ts src/orchestrator/parity/qualityProfileParity.test.ts src/orchestrator/autoRunner.qualityWiring.test.ts src/orchestrator/qualityWorkflowDispatch.test.ts` | All four green; new `noSecondScheduler` assertion green |
| 4 | `bun --cwd pivot test src/orchestrator/autoRunner.test.ts src/orchestrator/qualityWorkflowDispatch.test.ts src/orchestrator/parity/qualityProfileParity.test.ts src/orchestrator/qualityResume.integration.test.ts src/orchestrator/qualityCostRollup.test.ts && bun --cwd pivot typecheck && build-graph update ./graph.db <changed files>` | All commands exit 0 |

### Live-behavior vs contract/artifact tests

- **Live-behavior (must observe real production runtime):** Phase-1 (b), Phase-2 runner unit tests, Phase-3 parity end-to-end (`strict-profile end-to-end`).
- **Contract / artifact tests (assert shape only):** Phase-1 (a), `noSecondScheduler` source-scan assertions. These prove *imports/text*, not behavior — every contract assertion has a paired live test in the same phase.
- **Fake harnesses:** allowed only for the `mock.module('./qualityWorkflowDispatch', …)` *runner-plumbing* assertion in `autoRunner.qualityWiring.test.ts`. The production gate it covers (`runAll → runConfiguredQualityWorkflow → hooks.runner`) is also proved by Phase-1 (b) and Phase-3 parity, so a stale mock cannot fall through into a passing full suite.

## 8. Intentionally-Red Test Files

Repo-wide search found **no committed `*.red.test.ts` files** in `pivot/` — the references in `qualityResume.integration.test.ts:25`, `qualityCostRollup.test.ts:34`, `qualityKillSwitch.test.ts:25`, and `wal.qualityRuns.test.ts:26` are documentation comments describing a *convention*, not active red files. No exclusion plumbing is needed.

If any phase needs to commit a Red before Green lands in the same phase, name it `<feature>.red.test.ts` and keep the corresponding plan task `[~]`. Bun’s default discovery picks them up; suppress them only via the explicit per-phase command list in §7 (do **not** add them to an aggregate "skip" config — that would hide real failures). The `[~]` task in `plan.md` is the single source of truth for ownership until it flips to `[x]`.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: quality_workflow_hot_path_wiring_20260618
phase: track setup
commits: none
tests_run: none (strategy doc only; no implementation)
files_changed: measure/tracks/quality_workflow_hot_path_wiring_20260618/test-strategy.md (new)
plan_updates: none — plan.md and spec.md untouched per instructions
known_failures: none
handoff: Phase 1 implementer should start with the two Red files named in §7 (server.qualityWiring.test.ts + autoRunner.runEntrypoint.qualityWiring.test.ts), keep the contract+live pairing, and avoid adding new fakes beyond the existing mock.module pattern in autoRunner.qualityWiring.test.ts. The production hook factory should export a single createProductionQualityWorkflowHooks consumed by both server.ts:140 and autoRunner.ts:173 (referential identity asserted by extending guards/noSecondScheduler.test.ts).
END_MEASURE_AGENT_RESULT
