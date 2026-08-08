# Spec: Bounded factory activation

## Overview

Activate Fleet Commander's defining workflow for the imported `reading-advantage-llm-benchmark` project without turning on autonomous continuous execution. The product must configure one Pi-compatible agent, create one safe sprint assignment, explicitly run that project once, and expose a truthful terminal result.

This is a recovery track, not a new orchestration system. Reuse the existing Pi executor, Convex task/sprint records, one-shot orchestrator, and existing UI controls. Remove stale OpenCode/harness assumptions and fabricated success responses at the boundaries needed by this path.

The live audit proved the current blockers:

- the agent test endpoint always returns a hard-coded success and its tests never call it;
- the frontend agent editor depends on a removed Convex harness catalog even though Pi is the canonical executor;
- Sprint Planning would preselect every task once an agent exists and creates/assigns a sprint in two non-atomic mutations;
- AutoRunner filters on a nonexistent project status, mixes project slug/ID/name, and reads `rootPath` even though the project contract returns `path`;
- Project View posts to an unregistered `/api/projects/:id/run` endpoint;
- mocked tests pass across each of those broken production seams.

## Functional Requirements

### FR-1: One project identity reaches execution

- User-facing routes continue to use the project slug.
- Pivot resolves the slug once to the typed project record and consistently uses its Convex ID, canonical slug/name, and filesystem `path`.
- The project-scoped manual run control invokes a registered endpoint for exactly that project.
- A project-scoped action must never fall through to an all-project run.

### FR-2: Agent configuration is sourced from Pi

- Agent provider/model choices come from the installed Pi harness roster/model map, not the removed Convex harness table or OpenCode config.
- Binary/readiness flags reflect the real Pi CLI, harness root, role mapping, and model mapping.
- One agent with an exact mapped `provider/model` can be saved through the existing editor.
- Existing agent updates preserve the fields the current schema actually owns; unsupported editor fields must not be presented as durably saved.

### FR-3: Agent test is truthful and fail-closed

- `POST /api/agents/:name/test` performs a real readiness/preflight check for that agent.
- Missing Pi, missing harness files, unknown agent, unmapped model, timeout, nonzero probe exit, or unavailable provider credentials cannot return `status: success`.
- The UI labels this operation as readiness unless it performs an actual model invocation.
- No readiness test may edit a project or dispatch a task.

### FR-4: Sprint activation is bounded and atomic

- Sprint Planning selects no tasks by default and permits at most one task in this recovery slice.
- Creating the sprint and assigning its one task is a single validated Convex mutation.
- The mutation rejects invalid project/task/agent IDs, cross-project tasks, non-backlog tasks, inactive or saturated agents, duplicate/empty assignments, unmet dependencies, non-finite/negative budgets, and insufficient budgets.
- Failure leaves no active empty sprint and no partially updated task.
- A successful mutation changes exactly one backlog task to `ready` and sets `taskCount` to one.

### FR-5: One explicit run is observable

- Continuous mode remains disabled.
- The explicit run performs Pi/backend and project-path preflight before claim or spawn.
- At most one eligible task is claimed and dispatched for this acceptance path.
- The response identifies the selected task and terminal outcome; a truthful blocked/failed result is acceptable when credentials or provider service are unavailable.
- Work-run, execution-log, task status, receipt, and cost/token evidence are persisted when the corresponding stages occur.
- The user can observe the terminal result from the existing Project View/run surface without consulting server logs.

### FR-6: Weak tests are repaired

- Route-registration-only or fully mocked tests cannot satisfy this track.
- Tests must cross the production project resolver, sprint mutation, readiness logic, and project-scoped run handler sufficiently to fail for the audited defects.
- A no-mock local Chrome journey must configure/read one mapped agent, create exactly one assignment, trigger exactly one scoped run, and assert the real terminal result and persisted evidence.

## Non-Functional Requirements

- Prefer deleting stale harness/OpenCode branches and duplicate sprint mutations over adding adapters.
- Do not enable continuous mode during implementation or acceptance.
- Do not dispatch all 67 imported tasks.
- The first real Pi execution must use an explicit timeout/token bound and require a clean, disposable worktree or a deliberately non-mutating acceptance task.
- Convex functions retain strict validators; exported functions retain JSDoc.

## Acceptance Criteria

1. `/agents/new/edit` offers at least one model sourced from the installed Pi roster, and one saved agent reports truthful readiness.
2. `/sprint-planning?project=reading-advantage-llm-benchmark` selects the intended project, selects no tasks by default, and can atomically ready exactly one task.
3. A failed sprint request leaves zero new sprints and zero task changes.
4. Project View's run control reaches a registered project-scoped endpoint and cannot run another project.
5. With continuous mode disabled, one explicit run returns a terminal success or truthful blocked/failed outcome; no second task is claimed.
6. The UI exposes the selected task and terminal outcome, and subsequent real reads agree with the response.
7. Focused and full automated gates, graph update, Measure Doctor, and the real Chrome journey are recorded in `plan.md`.

## Out of Scope

- Continuous/autonomous operation, multi-task sprints, or multi-agent scheduling.
- Redesigning the agent, sprint, project, or timeline pages.
- Supporting the removed Convex harness catalog or OpenCode discovery.
- Broad recovery of legacy `pipelineRuns`/task-timeline architecture unless required to expose the bounded run result.
- React warning cleanup, bundle splitting, or unrelated dead-code deletion.
