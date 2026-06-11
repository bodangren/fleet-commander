# Plan: Configurable Measure-Quality Workflow Integration

## Phase S1: Configure Quality Workflow Profiles
_Story ref: spec.md#story-s1-configure-quality-workflow-profiles_
_Blast radius: project/settings schema and validators (graph callers incomplete; likely consumers: convex/schema/core.ts, convex/fleetCatalog.ts, pivot/src/config.ts, frontend settings routes/components)_

### Contract & Schema Definition
- [ ] Task: Define canonical quality-workflow vocabulary and TypeScript contracts for profile status, stage kind, applicability, gate policy, attempt policy, timeout policy, and task override.
- [ ] Task: Define versioned built-in profiles (`none`, `standard`, `strict`) whose ordered stages cover the supported Python-supervisor behavior without accepting arbitrary browser-authored shell commands.
- [ ] Task: Add Convex schema and validators for reusable profile definitions, project profile selection, task overrides, and immutable per-run profile snapshots.

### Test
- [ ] Task: Write validator and mutation contract tests for valid profiles, invalid stage orders, duplicate stages, unsafe configuration, authorization, and version updates.
- [ ] Task: Add backward-compatibility tests proving projects without a selected profile retain current orchestration behavior.
- [ ] Task: Add snapshot tests proving a claimed run keeps its original profile version after the source profile changes.

### Implement
- [ ] Task: Implement typed Convex queries/mutations for listing profiles, reading effective project/task configuration, publishing profile versions, selecting a project profile, and recording authorized overrides.
- [ ] Task: Implement the effective-profile resolver with precedence `task override -> project selection -> none`, returning a validated immutable snapshot.
- [ ] Task: Seed built-in profiles idempotently and expose them through typed Pivot boundaries used by the frontend and orchestrator.

### Generate Docs & Doctor
- [ ] Task: Document profile semantics, backward-compatibility policy, override audit policy, and the explicit single-control-plane boundary.
- [ ] Task: Run targeted Convex/Pivot tests, typecheck, `measure/generate.sh`, `measure/doctor.sh all`, and `build-graph update` for changed TypeScript files.

## Phase S2: Execute Quality Stages Canonically
_Story ref: spec.md#story-s2-execute-quality-stages-canonically_
_Blast radius: runProject (0 graph callers; manual hot-path imports include AutoRunner and pipelineEngine routes), executeWithRetry (0 graph callers; invoked by runProject), handleSuccess (0 graph callers; invoked by runProject), resolveDispatchStage (0 graph callers; invoked by runProject)_

### Contract & Schema Definition
- [ ] Task: Define the `QualityWorkflowRunner`, stage executor, stage gate, applicability evaluator, and structured feedback/result contracts as injected orchestrator dependencies.
- [ ] Task: Define production stage semantics and prompts for strategy, Red, Green, phase acceptance, adversarial audit, conditional UX audit, final acceptance, and eligible closeout.
- [ ] Task: Define the boundary between the nested quality workflow and parent executor dispatch: quality pass permits existing success handling; quality fail returns a typed parent execution failure.

### Test
- [ ] Task: Add production-import characterization tests proving no-profile `runProject` behavior, reviewer routing, merger routing, atomic claims, and Git hooks are unchanged.
- [ ] Task: Write Red-stage tests proving committed failing tests are required and non-test source changes are rejected.
- [ ] Task: Write stage-sequencing tests covering required pass, optional skip with reason, gate feedback retry, exhausted attempts, and downstream short-circuit.
- [ ] Task: Write closeout-applicability tests proving closeout runs only for the final eligible track work and cannot archive before real `verify` plus orphans pass.

### Implement
- [ ] Task: Implement a modular quality-workflow runner using existing agent execution/session primitives; do not invoke the Python supervisor or create a second scheduler.
- [ ] Task: Implement stage applicability evaluators for track setup, frontend-facing UX changes, final acceptance, and final track closeout.
- [ ] Task: Implement mechanical stage gates equivalent to the supported Python contracts, including structured result blocks and machine-readable audit results.
- [ ] Task: Integrate the runner into executor dispatch after atomic claim and before `handleSuccess`, preserving app-owned retries, reviewer/merger routing, and Git lifecycle.
- [ ] Task: Add a kill switch and fail-closed configuration behavior so invalid quality configuration pauses/blocks affected work without disabling unrelated no-profile projects.

### Generate Docs & Doctor
- [ ] Task: Document the canonical execution sequence and ownership boundary between parent pipeline stages and nested quality stages.
- [ ] Task: Run targeted orchestrator characterization/integration tests, full Pivot tests/typecheck, `measure/generate.sh`, `measure/doctor.sh all`, and incremental graph updates.

## Phase S3: Persist And Recover Quality Runs
_Story ref: spec.md#story-s3-persist-and-recover-quality-runs_
_Blast radius: PipelineRunLifecycle (0 graph callers; manually constructed by runProject), persistRun/appendRunLog and WAL targets, workRuns/executionLogs/runContracts Convex schemas and consumers_

### Contract & Schema Definition
- [ ] Task: Define parent quality-run and quality-stage-attempt records with stable correlation IDs, idempotency keys, profile snapshot, structured gate evidence, cost/token telemetry, and terminal states.
- [ ] Task: Define resume, cancellation, retry, blocked, and override transition rules; identify which transitions are app-owned versus quality-runner-owned.
- [ ] Task: Extend cost and timing contracts so every stage attempt rolls up exactly once into the parent work run and project/sprint budget reconciliation.

### Test
- [ ] Task: Write Convex mutation/query tests for idempotent start, append attempt, finish, skip, retry, resume, and terminal transitions.
- [ ] Task: Write WAL tests for supported quality-run mutations, replay ordering, duplicate replay, corrupt entries, and unsupported-target visibility.
- [ ] Task: Write restart/resume integration tests proving passed required stages are not rerun and the immutable profile snapshot is retained.
- [ ] Task: Write cost/recovery tests proving no double charge, correct circuit/retry behavior, blocker creation, and owner notification on exhausted hard gates.

### Implement
- [ ] Task: Add modular Convex tables, indexes, validators, queries, and mutations for quality workflow runs and attempts.
- [ ] Task: Extend `PipelineRunLifecycle` or add a focused sibling lifecycle that persists quality events while preserving parent work-run ownership.
- [ ] Task: Extend WAL target support and operational error reporting for quality-run persistence.
- [ ] Task: Implement resume-from-first-incomplete-required-stage and canonical blocked/ready recovery handoff.
- [ ] Task: Roll stage timing, token, model, and cost telemetry into existing budget reconciliation and analytics inputs exactly once.

### Generate Docs & Doctor
- [ ] Task: Document the state machine, idempotency keys, WAL behavior, retention expectations, and recovery ownership.
- [ ] Task: Run Convex/Pivot persistence, WAL, recovery, budget, and notification tests; run typechecks, generate, doctor, and graph updates.

## Phase S4: Operate Quality Workflows Visibly
_Story ref: spec.md#story-s4-operate-quality-workflows-visibly_
_Blast radius: settings surfaces, PipelinesPage, TaskTimelinePage, PipelineTimeline, execution log hooks, Operations timeline, analytics/performance consumers_

### Contract & Schema Definition
- [ ] Task: Define typed API/view models for profile configuration, effective task profile, quality run summary, stage attempt detail, evidence summary, and authorized intervention actions.
- [ ] Task: Define UI state and accessibility contracts for loading, empty, invalid-profile, running, skipped, failed, blocked, and completed quality workflows.
- [ ] Task: Define aggregate quality metrics separately from parent dispatch/executor/reviewer/merger metrics.

### Test
- [ ] Task: Write frontend hook and component tests for selecting/validating a project profile and inspecting immutable profile versions.
- [ ] Task: Write task-timeline tests for stage order, role attribution, attempt history, cost/duration, evidence, skips, and failure feedback.
- [ ] Task: Write Operations intervention tests for authorized retry, disable, and profile-change actions with confirmation and audit feedback.
- [ ] Task: Add focused Playwright E2E coverage for configuring a profile, observing a fixture quality run, and diagnosing a blocked gate.

### Implement
- [ ] Task: Add project settings UI for profile selection and read-only stage inspection, reusing established settings mutation/rollback patterns.
- [ ] Task: Extend the task timeline and execution-log surfaces with nested quality-stage progress and attempt details.
- [ ] Task: Extend Operations/Diagnose with failed-gate visibility and authorized intervention actions.
- [ ] Task: Extend performance/analytics read models with separate quality-stage duration, cost, retry, skip, and rejection metrics.

### Generate Docs & Doctor
- [ ] Task: Document operator workflows, intervention semantics, profile-change effects, and metric definitions.
- [ ] Task: Run frontend unit tests/check, targeted Playwright specs, generate, doctor, and incremental graph updates.

## Phase S5: Prove Parity And Cut Over
_Story ref: spec.md#story-s5-prove-parity-and-cut-over_
_Blast radius: automation-supervisor.py behavioral reference, canonical runAllProjects/runProject hot path, production docs and entrypoints_

### Contract & Schema Definition
- [ ] Task: Create a bounded parity-fixture contract covering stage order, applicability, gate outcomes, retry feedback, resume, and closeout eligibility for the supported strict profile.
- [ ] Task: Define cutover acceptance rules: canonical orchestrator is the only production scheduler; Python supervisor status is explicit; rollback disables profiles without reverting schema.

### Test
- [ ] Task: Build parity tests that compare Python dry-run/reference decisions with integrated workflow decisions for representative fixture tracks.
- [ ] Task: Add a no-profile production regression suite and a strict-profile end-to-end integration suite through real canonical imports.
- [ ] Task: Run a bounded live fixture proving Red failure, Green success, independent audit, persisted evidence, cost rollup, reviewer/merger continuation, and eligible closeout.
- [ ] Task: Add guard tests proving no production entrypoint launches `automation-supervisor.py` and no second scheduler/claimant was introduced.

### Implement
- [ ] Task: Resolve supported parity gaps without weakening integrated mechanical gates or masking failures with fake harnesses.
- [ ] Task: Add rollout controls, migration notes, profile adoption guidance, rollback procedure, and production readiness diagnostics.
- [ ] Task: Mark the Python supervisor clearly deprecated/manual-reference-only or record an explicit follow-up removal decision with owner and date.
- [ ] Task: Remove or quarantine any temporary adapter, duplicate state path, or migration-only entrypoint before closeout.

### Generate Docs & Doctor
- [ ] Task: Update product/workflow/architecture documentation to describe the integrated quality workflow and single-control-plane ownership.
- [ ] Task: Run `npm run verify` in real mode and record every gate result; do not accept fake-harness-only evidence.
- [ ] Task: Run `measure/doctor.sh all`, confirm orphans are clean or TD-backed, and run `build-graph audit ./graph.db` with an explicit long timeout.
- [ ] Task: Update `graph.db` incrementally for all changed TypeScript files, confirm production hot-path imports manually, and complete Measure closeout only after all gates pass.
