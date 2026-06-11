# Configurable Measure-Quality Workflow Integration

## Overview

Make production task delivery enforce configurable Measure-quality workflows
without creating a second scheduler or losing Fleet Commander's operational
controls.

Fleet Commander's canonical Bun orchestrator already owns task selection,
continuous scheduling, Convex persistence, budget reservations and
reconciliation, retries, circuit breakers, notifications, Git branches,
commits, merges, and dashboard visibility. `measure/automation-supervisor.py`
provides a stronger delivery-quality policy: strategy generation, explicit
Red/Green separation, independent phase acceptance, adversarial testing,
conditional UX review, final acceptance, and mechanical track closeout.

This track brings those quality-workflow capabilities into the canonical
orchestrator as configurable nested stages. The Python supervisor is a
behavioral reference and local/manual fallback during migration; it must not
become a second production scheduler.

## Decisions And Boundaries

- The canonical production entrypoint remains `runAllProjects` / `runProject`.
- A selected task may execute a versioned quality-workflow profile inside its
  executor dispatch. Quality stages do not independently select or claim work.
- Fleet Commander remains responsible for scheduling, atomic claims, budgets,
  cost accounting, recovery policy, circuit breakers, notifications, Git
  lifecycle, and operator visibility.
- The quality-workflow runner owns stage ordering, role prompts, Red/Green
  boundaries, structured gate evaluation, independent audits, full
  verification, and eligible Measure track closeout.
- Passing a quality workflow does not bypass configured reviewer or merger
  stages. It permits the existing executor success transition to continue.
- Existing projects with no selected quality profile retain current behavior.
- New production code must not shell out to
  `measure/automation-supervisor.py`; reusable behavior is implemented through
  typed Bun/Convex contracts and existing agent execution primitives.
- The existing repository `verify` and closeout rules from
  `quality_gate_enforcement_20260605` are consumed, not reimplemented.

## Stories

### Story S1: Configure Quality Workflow Profiles
**As an** engineering manager
**I want** versioned, project-selectable quality-workflow profiles
**So that** I can choose the required delivery rigor without changing the scheduler

**Acceptance Criteria:**
- Given a project with no selected quality profile, When the orchestrator
  dispatches a task, Then the current executor/reviewer/merger behavior is
  unchanged.
- Given an administrator creates or updates a profile, When it is validated,
  Then each stage has a typed role, required/optional policy, applicability
  condition, model/agent override, attempt limit, timeout, and gate contract.
- Given a project selects a profile, When a task is claimed, Then the run stores
  an immutable versioned snapshot of that profile.
- Given a task needs an exception, When an authorized task-level override is
  applied, Then the override is explicit, validated, and recorded in the audit
  trail.

**Estimate:** L
**Priority:** Must

### Story S2: Execute Quality Stages Canonically
**As an** engineering manager
**I want** configured quality stages executed inside the canonical task run
**So that** delivery rigor is enforced without creating a competing control plane

**Acceptance Criteria:**
- Given a claimed task with a quality profile, When executor dispatch starts,
  Then the orchestrator runs the configured strategy, Red, Green, audit, UX,
  final-acceptance, and closeout stages in profile order and skips
  non-applicable optional stages with a recorded reason.
- Given a Red stage, When the stage completes, Then the gate proves tests were
  committed, at least one targeted test failed for the intended missing
  behavior, and non-test implementation files were not changed.
- Given a Green or audit stage, When its gate fails, Then the same stage receives
  structured feedback and retries within app-owned limits; downstream stages
  do not run.
- Given all required quality stages pass, When executor dispatch completes,
  Then the existing reviewer and merger routing continues unchanged.
- Given final closeout is applicable, When it runs, Then it may archive a
  Measure track only after the real `verify` and orphans gates pass.

**Estimate:** XL
**Priority:** Must

### Story S3: Persist And Recover Quality Runs
**As an** operator
**I want** durable quality-stage state, costs, logs, and recovery
**So that** interrupted or failed workflows are auditable and resumable

**Acceptance Criteria:**
- Given any quality stage attempt, When it starts or finishes, Then Convex stores
  the parent run, profile snapshot, stage, role, attempt, status, timestamps,
  structured result, gate evidence, cost, tokens, model, and failure reason.
- Given Convex is temporarily unavailable, When quality-run persistence fails,
  Then the existing WAL mechanism queues supported writes without silently
  reporting the stage as durably persisted.
- Given the process restarts after one or more stages passed, When the task is
  dispatched again, Then execution resumes from the first incomplete required
  stage using the stored profile snapshot.
- Given a stage exhausts attempts or violates a hard gate, When recovery policy
  is evaluated, Then the parent task becomes blocked or ready according to the
  canonical recovery rules and the owner is notified.
- Given stage agents consume tokens, When the parent run completes, Then budget
  reconciliation and cost reporting include every quality-stage attempt exactly
  once.

**Estimate:** XL
**Priority:** Must

### Story S4: Operate Quality Workflows Visibly
**As an** engineering manager
**I want** configuration and live quality-run visibility in Fleet Commander
**So that** I can understand, tune, and intervene in delivery workflows

**Acceptance Criteria:**
- Given a project settings surface, When I configure quality workflow behavior,
  Then I can select a profile, inspect its ordered stages, and see validation
  errors before saving.
- Given a task with quality stages, When I open its timeline, Then I can see
  passed, running, skipped, failed, and blocked stages with role attribution,
  attempts, costs, duration, evidence summary, and failure feedback.
- Given a quality run is blocked or exhausted, When it appears in Operations,
  Then I can identify the exact failed gate and use an authorized retry,
  disable, or profile-change action with an audit record.
- Given aggregate run history, When I inspect performance, Then quality-stage
  time, cost, retry, and rejection metrics are distinguishable from normal
  dispatch/executor/reviewer/merger metrics.

**Estimate:** L
**Priority:** Must

### Story S5: Prove Parity And Cut Over
**As a** maintainer
**I want** a measured migration from the Python supervisor to the integrated workflow
**So that** production gains its quality guarantees without retaining ambiguous parallel systems

**Acceptance Criteria:**
- Given representative fixture tracks, When the Python reference and integrated
  workflow are run in bounded dry-run/parity mode, Then stage ordering,
  applicability decisions, gate outcomes, retries, and closeout eligibility
  match for the supported profile.
- Given the integrated workflow is disabled, When existing production
  orchestrator characterization tests run, Then behavior remains unchanged.
- Given the integrated workflow is enabled, When an end-to-end fixture track is
  processed, Then it demonstrates Red failure, Green success, independent audit,
  persisted evidence, reviewer/merger continuation, and eligible closeout.
- Given cutover completes, When production entrypoints and docs are inspected,
  Then only the canonical orchestrator schedules production work; the Python
  supervisor is clearly documented as deprecated/manual reference or removed by
  an explicit follow-up decision.
- Given closeout, When repository gates run, Then `verify`, targeted integration
  tests, `doctor.sh all`, and the long-timeout `build-graph audit` are green.

**Estimate:** L
**Priority:** Must

## Non-Functional Requirements

- **Backward compatibility:** Quality workflows are opt-in for existing
  projects; no-profile behavior must remain characterized and green.
- **Single control plane:** No new timer, scheduler, task claimant, budget
  authority, Git authority, or production run registry may be introduced.
- **Determinism:** A run executes the immutable profile snapshot captured at
  claim time, even if the source profile changes later.
- **Idempotency:** Repeated persistence, retry, and resume operations must not
  double-charge cost, duplicate stage completion, or archive a track twice.
- **Security:** Profile and override mutations require the existing authorized
  actor boundary; arbitrary shell commands are not accepted from the browser.
- **Observability:** Every skip, retry, failure, override, and closeout decision
  must have a machine-readable reason and correlate to the parent task/run.
- **Maintainability:** Quality workflow logic must be modular and typed; the
  monolithic Python supervisor must not be translated into a TypeScript
  god-file.
- **Documentation:** All exported functions introduced by the track use JSDoc.

## Out Of Scope

- Replacing the canonical task scheduler, scorer, budget system, recovery
  system, Git hooks, reviewer stage, or merger stage.
- Rebuilding the repository-wide `verify`, orphan detection, or closeout rule.
- Making the legacy YAML `/api/pipelines/*` runner the canonical quality path.
- General-purpose visual workflow authoring or arbitrary user-authored shell
  stages.
- Automatically enabling strict quality workflows for existing projects.
- Fixing unrelated current gate failures or open tech debt.

## Dependencies And Risks

- Depends on the real `verify` and closeout behavior owned by
  `quality_gate_enforcement_20260605`.
- Must coordinate with `orchestrator_decomposition_20260605` boundaries and
  preserve its thin-shell intent.
- Must respect the `parallel_systems`, `hot_path_proof`, `red_not_done`,
  `fake_gate_mask`, `execution_guard`, and `auto_runner_fail_closed` lessons.
- Graph caller discovery currently returns false negatives for hot-path symbols;
  implementation must pair graph queries with production-import tests and
  direct source inspection.
