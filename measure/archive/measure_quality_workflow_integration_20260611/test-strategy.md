# Test Strategy: Configurable Measure-Quality Workflow Integration

Scope: ground every gate in real production imports of the canonical orchestrator. Honor `parallel_systems`, `hot_path_proof`, `red_not_done`, `fake_gate_mask`, `execution_guard`, `auto_runner_fail_closed`. No new scheduler, no new claimant, no browser-authored shell.

## 1. Testing pyramid per phase
- **S1 (config):** wide unit base on validators/resolver/snapshot; thin Convex contract layer; zero E2E.
- **S2 (execute):** unit-level stage gates + applicability; characterization tests of `runProject`/`executeWithRetry`/`handleSuccess` import surface; one bounded integration through real `runProject` import with injected stage runner.
- **S3 (persist):** Convex mutation/query unit tests; WAL unit tests; one resume integration through `PipelineRunLifecycle` import; budget rollup unit test.
- **S4 (operate):** React Testing Library unit/component tests; hook tests with Convex fakes; **one** Playwright E2E (configure → observe → diagnose), never multiplied.
- **S5 (parity/cutover):** parity-fixture contract tests; full real-mode `npm run verify`; guard tests on entrypoint imports; long-timeout graph audit.

## 2. Shared fixtures / mocks
- Reuse `convex/__fixtures__/foundation.ts` and `frontend/src/__fixtures__/insightsFixtures.ts`; extend with `qualityProfileFixtures.ts` (built-in `none|standard|strict` snapshots) under the same folders — do not invent a new fixtures root.
- Reuse `pivot/src/orchestrator/orchestrator.characterization.test.ts:installLoaders` shape for runProject sequencing; add a `installQualityRunnerStub` peer to keep dispatch-order detection deterministic.
- Convex tests reuse the existing `convexTest` harness already wired for `workRuns`/`executionLogs`/`runContracts`; add a `qualityRuns` fixture seeded from the same foundation builder.
- WAL tests reuse `pivot/src/failover/wal.ts` helpers (`append`, `getUncommittedEntries`) via a tmp `getWalDir` override; no new WAL implementation.
- Stage-runner fake is **dependency-injected only**; production code never imports it.

## 3. Cross-phase edge cases & dependencies
- No-profile path must remain byte-for-byte equivalent — characterization snapshots from S2 are reused as regression in S3/S4/S5.
- Profile snapshot immutability after claim crosses S1→S3 (resume) and S5 (parity replay).
- Retry budget: app-owned (`executeWithRetry`) vs stage-owned (gate retry) must never double-charge cost — single rollup test exercised in S3 and asserted again in S5.
- Resume policy: passed required stages never rerun; resume-from-blocked must agree with canonical recovery (S3 ↔ S2 boundary).
- Kill switch / invalid profile pauses only affected project; unrelated no-profile projects keep running (S2 ↔ S5).
- Closeout cannot fire before real `verify` + orphans pass (S2 acceptance gate + S5 live proof).
- Frontend visibility (S4) consumes only typed Convex/Pivot boundaries defined in S1/S3 — no direct schema reads.

## 4. Architecture guardrails
- Only one production scheduler: guard test greps `pivot/src` and `convex/` for `spawn.*automation-supervisor` / `child_process.*supervisor` and fails on any match.
- Only one claimant: guard test asserts no new function calls Convex `claimNextTask`-equivalent outside `runProject`'s existing call site.
- No new top-level timer: guard test asserts `setInterval`/`setTimeout` additions are wrapped in `withExecutionGuard` and live in `autoRunner.ts` only.
- Quality runner is injected into executor dispatch via interface; no direct cross-import from `convex/` into orchestrator stage logic.
- Doctor allowlists (`godfile-allowlist.txt`, `as-any-allowlist.txt`, `boundary-allowlist.txt`, `stub-mutation-allowlist.txt`) are not expanded for new code; new entries require a tech-debt ID.

## 5. Per-phase test approach
- **S1:** TDD validators first. Snapshot test = artifact contract (serialized profile JSON). Mutation tests prove authorized actor + immutability.
- **S2:** Red-stage gate is itself proven Red by a test that asserts the gate rejects when no failing test was committed (true behavior, not file existence). Sequencing tests assert downstream short-circuit by recording call order on the injected runner.
- **S3:** Idempotency proved by replaying the same `idempotencyKey` and asserting one row + one cost line. WAL replay tests cover duplicate, corrupt, unsupported-target.
- **S4:** Component tests assert `aria-*` state for skipped/blocked/failed; Playwright covers a single end-to-end fixture run, not a matrix.
- **S5:** Parity = decision-table fixture compared to Python reference (dry-run JSON); live = real `npm run verify`. Reject any "evidence" that comes only from `VERIFY_FAKE_GATE_DIR`.

## 6. build-graph findings shaping strategy
- `runProject` shows 0 graph callers but is imported by `autoRunner.ts` and `runAllProjects.ts` (manual confirmation); strategy treats graph caller counts for orchestrator hot-path symbols as **false-negative-prone** and pairs every refactor with a production-import test (`orchestrator.shell.test.ts`, `runAllProjects.test.ts`).
- `executeWithRetry`, `handleSuccess`, `PipelineRunLifecycle`: 0 graph callers each; all are invoked through `runProject` body inspection — characterization tests must keep using `measureFunctionBody`-style body parsing or direct-call assertions, not graph-only proofs.
- `appendRunLog` already routes through WAL — S3 extends, does not replace.
- `PipelineTimeline.tsx` and `TaskTimelinePage.tsx` are the only timeline render surfaces — S4 extends in place, no new timeline component.
- No existing `qualityRuns`/`qualityStageAttempts` schema — S3 must add and seed.
- 641 files, 5092 nodes, `validators.ts`/`router.ts`/`types.ts` are the heaviest import hubs — keep new shared types in `pivot/src/shared/` (mirrors `runContract.ts`/`harnessProfile.ts`) to stay inside known boundaries.

## 7. Live-proof plan (per phase)
Pivot tests run via `bun --cwd pivot test`; frontend via `bun --cwd frontend test`; E2E via `bun --cwd frontend test:e2e`. **Artifact tests** (validator/snapshot/contract) prove the contract; **live-behavior tests** prove production import paths.

- **S1 Red:** `bun --cwd pivot test src/shared/qualityProfile.test.ts convex/qualityProfiles.test.ts` (must fail on missing validator). **Green/closeout gate:** same command green + `bun --cwd pivot typecheck` + `npx convex codegen`. (Artifact-only phase; no live runtime gate.)
- **S2 Red:** `bun --cwd pivot test src/orchestrator/qualityWorkflowRunner.test.ts src/orchestrator/orchestrator.characterization.test.ts` (asserts new stage dispatch + unchanged no-profile path). **Green/closeout:** above + bounded integration `bun --cwd pivot test src/orchestrator/runProject.qualityIntegration.test.ts` exercising real `runProject` import with injected runner. **Live-behavior smoke:** characterization tests are live (real `runProject` import); the injected runner is plumbing, not a gate command.
- **S3 Red:** `bun --cwd pivot test src/orchestrator/stages/qualityRunLifecycle.test.ts src/failover/wal.qualityRuns.test.ts` + `bun --cwd pivot test convex/qualityRuns.test.ts`. **Green/closeout:** above + resume integration `src/orchestrator/qualityResume.integration.test.ts` (real `PipelineRunLifecycle` import) + budget reconciliation unit.
- **S4 Red:** `bun --cwd frontend test src/pages/settings/QualityProfileSection.test.tsx src/components/timeline/QualityStageRow.test.tsx`. **Green/closeout:** `bun --cwd frontend check` + `bun --cwd frontend test:e2e -- --grep @quality-workflow` (one targeted E2E spec).
- **S5 Red:** `bun --cwd pivot test src/orchestrator/parity/qualityProfileParity.test.ts src/orchestrator/guards/noSecondScheduler.test.ts`. **Green/closeout gate:** `npm run verify` in **real mode** (`unset VERIFY_FAKE_GATE_DIR`) + `bash measure/doctor.sh all` + `build-graph audit ./graph.db` (timeout 600s) + `build-graph update ./graph.db <changed files>`. Fake-harness verify output is rejected.

### Fake-harness boundary
`measure/verify.sh` supports `VERIFY_FAKE_GATE_DIR` for plumbing-only tests (e.g. `tests/verify.test.sh`, `phase4-green-gate.test.sh`). Strategy rule: any S5 evidence run **must explicitly `unset VERIFY_FAKE_GATE_DIR`** and log the environment; runner harness for the injected stage runner is similarly DI-only and never reachable from `runProject` in a production build (guard test in S5 asserts no production import of any `*.fake.ts` / `*.stub.ts` module).

### Intentionally-red tests & exclusion
Each phase's first Red task creates failing test files that `bun --cwd pivot test` (no filter) would discover. Mitigation:
1. Every intentionally-failing test file is **owned by a still-`[~]` task** in the same phase; the task stays `[~]` until its Green sibling lands (per `red_not_done`).
2. Red tests are committed under a `*.red.test.ts` suffix and the corresponding `[~]` task's description names the file, so reviewers and `measure status` can list outstanding reds.
3. Phase-closing Green gate runs the full unfiltered suite (`bun --cwd pivot test` / `bun --cwd frontend test`) — a stray red blocks `[x]`. No suite-level skip/allowlist is added.
4. S5 cutover requires zero `*.red.test.ts` files remaining; a doctor-style grep guard in `noSecondScheduler.test.ts` enforces this at closeout.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: measure_quality_workflow_integration_20260611
phase: track setup
commits: none
tests_run: build-graph stats ./graph.db (pass); build-graph search runProject|PipelineRunLifecycle|executeWithRetry|handleSuccess|AutoRunner|verify|WAL|workRuns|executionLogs|PipelineTimeline|TaskTimelinePage|Profile|runContract (pass); build-graph callers runProject|handleSuccess (pass, 0 results confirms graph false-negative for orchestrator hot path)
files_changed: measure/tracks/measure_quality_workflow_integration_20260611/test-strategy.md (new)
plan_updates: none (plan.md untouched per role)
known_failures: none
handoff: Implementer should treat orchestrator-hot-path graph caller counts as unreliable and pair every change with the characterization tests named in §7; S5 must run npm run verify with VERIFY_FAKE_GATE_DIR unset; intentionally-red files use *.red.test.ts suffix and keep owning task [~] until Green lands.
END_MEASURE_AGENT_RESULT
