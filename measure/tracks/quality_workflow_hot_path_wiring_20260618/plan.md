# Plan: Quality Workflow Hot-Path Wiring

## Phase 1: Red - Production Gap

- [~] Task: Add a production-import test proving `server.ts` and `runAutoRunner()` construct `AutoRunner` with non-empty `qualityWorkflowHooks`.
- [~] Task: Add a failing fixture where a non-none profile currently fails only because `hooks.runner` is missing.
- [~] Task: Record baseline commands and graph queries in this plan.

### Phase 1 Baseline (recorded 2026-06-18, MID start)

Targeted Red command (per test-strategy §7 row "Phase 1"):

```bash
bun --cwd pivot test \
  src/orchestrator/server.qualityWiring.test.ts \
  src/orchestrator/autoRunner.runEntrypoint.qualityWiring.test.ts \
  src/orchestrator/qualityProfile.fixtureHooks.test.ts
```

Phase 1 expected result at MID start: 8/8 fail, all for the missing-production-wiring reason (factory module absent, `server.ts` does not reference it, `runAutoRunner` does not forward `qualityWorkflowHooks`). See "Red command log" below.

Build-graph probes that shaped the Red surface (per test-strategy §1):

```bash
# Confirms the production runner is only a test-only type today.
build-graph search ./graph.db "QualityWorkflowRunner"
# Confirms AutoRunner / runAutoRunner / runConfiguredQualityWorkflow have no
# graph-traceable callers; wiring tests must use real production imports.
build-graph callers ./graph.db "AutoRunner"
build-graph callers ./graph.db "runAutoRunner"
build-graph callers ./graph.db "runConfiguredQualityWorkflow"
# Reference: the canonical git-hook factory pattern the new factory mirrors.
build-graph inspect ./graph.db "createAutoPushGitHooks"
# Confirms the planned factory symbol is not in the graph yet (Red state).
build-graph search ./graph.db "createProductionQualityWorkflowHooks"
```

Graph state: `graph.db` mtime 2026-06-19 (fresh), no TypeScript changes required for the Red phase. The three new test files are deferred to the Green phase's `build-graph update` (Red phase does not modify `graph.db` per the Red-phase boundary: test files and Measure docs only).

### Red command log (Phase 1, MID attempt 1)

Targeted command:

```bash
bun --cwd pivot test \
  src/orchestrator/server.qualityWiring.test.ts \
  src/orchestrator/autoRunner.runEntrypoint.qualityWiring.test.ts \
  src/orchestrator/qualityProfile.fixtureHooks.test.ts
```

Result: 0 pass, 8 fail, 7 expect() calls, 746ms. All 8 failures are the expected missing-wiring failures (factory module not found / `server.ts` does not reference the factory / `runAutoRunner` does not forward `qualityWorkflowHooks`). No false-Red risks identified.

Existing related tests (sanity — must remain green while the Red phase lands):

```bash
bun --cwd pivot test \
  src/orchestrator/autoRunner.qualityWiring.test.ts \
  src/orchestrator/autoRunner.test.ts \
  src/orchestrator/parity/qualityProfileParity.test.ts \
  src/orchestrator/guards/noSecondScheduler.test.ts
```

Result: 42 pass, 0 fail (across 4 files). Green baseline preserved.

## Phase 2: Production Runner

- [ ] Task: Implement a production `QualityWorkflowRunner` factory in `pivot/src/orchestrator/`.
- [ ] Task: Route stage execution through the existing configured harness/agent boundary.
- [ ] Task: Capture stage stdout/stderr, status, duration, attempt index, and failure reason.
- [ ] Task: Preserve existing fail-closed behavior for missing harness configuration.

## Phase 3: Hot-Path Wiring

- [ ] Task: Import the production hook factory in `pivot/src/server.ts` and pass it to `AutoRunner`.
- [ ] Task: Use the same hook factory in `runAutoRunner()`.
- [ ] Task: Add a guard test proving production code does not import or spawn `measure/automation-supervisor.py`.
- [ ] Task: Confirm continuous-mode skip behavior and git hooks still thread through.

## Phase 4: Verification And Closeout

- [ ] Task: Run focused pivot tests for auto-runner, quality dispatch, parity, resume, and cost rollup.
- [ ] Task: Run `bun --cwd pivot typecheck`.
- [ ] Task: Run `build-graph update ./graph.db` for changed TypeScript files.
- [ ] Task: Update `measure/lessons-learned.md` or `measure/tech-debt.md` if new process debt remains.
- [ ] Task: Mark this track complete only after hot-path tests prove real production imports.
