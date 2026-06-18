# Fleet Commander Workflow

## Product Workflow

1. A human creates or imports a project and prepares tasks with specs, story points, priorities, and acceptance criteria.
2. Sprint planning selects work, estimates budget impact, and starts budget-constrained execution.
3. The Bun AutoRunner dispatches eligible ready tasks when continuous mode is enabled.
4. The canonical pipeline routes work through executor, reviewer, and merger stages, with budget reservation/reconciliation and git lifecycle hooks.
5. Convex records task state, run history, costs, quality runs, notifications, and dashboard data.
6. The frontend observes Convex and pivot route responses to show boards, operations, history, and settings.

## Task States

| State | Meaning |
| --- | --- |
| backlog | Not in the active sprint |
| ready | Eligible for dispatch when dependencies and budget allow |
| in_progress | Claimed by the orchestrator or active agent stage |
| review | Awaiting reviewer or merger work |
| done | Accepted and complete |
| blocked | Blocked by dependencies, conflicts, or failed execution |

## Production Scheduler

The canonical production scheduler is the Bun orchestrator (`pivot/src/orchestrator/autoRunner.ts` + `pivot/src/orchestrator/orchestrator.ts`). It owns task selection, continuous scheduling, Convex persistence, budget reservations, retries, circuit breakers, notifications, git lifecycle, and task-stage dispatch.

There must be exactly one production scheduler and one production task claimant. The legacy `measure/automation-script.sh` and `measure/automation-supervisor.py` are deprecated behavioral references and must not be spawned by production code.

## Quality Workflow

Quality profiles are selected through the app and persisted in Convex. The intended architecture nests quality stages inside the existing executor dispatch; quality stages must not independently claim tasks or run as a second scheduler.

Current review finding: production AutoRunner does not yet supply a real `QualityWorkflowRunner`, so non-none profiles fail closed. Remediation is tracked in `measure/tracks/quality_workflow_hot_path_wiring_20260618/`.

## Track Closeout

A track may be archived only when both conditions are met:

1. `verify` passes (all gates green, exit 0) and results are recorded in the plan.
2. The orphans report (`doctor.sh orphans`) is clean, or new entries are added to the allowlist with a tracked TD id.

Do not mark a task `[x]` for Red-only work. `[x]` means the implementation landed and the stated verification is green at HEAD.

## Development Commands

```bash
bun install
npm run dev
bun --cwd pivot test
bun --cwd pivot typecheck
bun --cwd frontend test --run
bun --cwd frontend check
bash measure/doctor.sh all
```

## Commit Guidelines

Use focused Conventional Commit messages, such as `fix(pivot): ...`, `feat(frontend): ...`, `chore(measure): ...`, or `measure(plan): ...`. After completed source work, update `graph.db` incrementally with the changed files.
