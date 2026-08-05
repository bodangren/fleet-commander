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

## Risk Class and Stage Count

The workflow used to run the same eight stages for every track. A typo fix paid
the same tax as an auth change. Stage count is now a property of the track's
risk, declared as `risk_class` in `measure/tracks/<id>/metadata.json`:

```json
{ "track_id": "...", "type": "chore", "risk_class": "normal" }
```

| `risk_class` | Stages that must run | Use for |
| --- | --- | --- |
| `normal` (default) | red, green, phase_acceptance | Ordinary features, bugs, chores |
| `elevated` | + strategy, acceptance | Auth, permissions, budget, secrets |
| `critical` | all eight | Money movement, migrations, deletion, schema changes |

Two rules make the declaration hard to game:

1. **Escalation is one-way.** `pivot/src/shared/riskClass.ts` scans the task
   title and spec for money, auth, and data-loss signals. A match raises the
   class above what was declared. Nothing lowers it.
2. **An absent or malformed declaration resolves to `normal`,** then goes
   through the same escalation. A broken `metadata.json` cannot skip the gate by
   crashing the parser.

A `critical` track is promoted to the `strict` profile even when the project
selected something weaker. A project-level setting cannot opt a dangerous change
out of review.

## Acceptance Commands

Free-text `acceptanceCriteria` are read by a reviewer agent, which then reports
"pass". That is a proxy. The June 2026 audit found 9 of 15 "complete" tracks
were false positives, which is exactly the failure a proxy gate cannot catch.

A track therefore declares an **acceptance command** on its run contract before
implementation begins:

```
convex mutation runContracts:declareAcceptanceCommand \
  taskId=<task> command='bun run --cwd pivot test' timeoutMs=600000 \
  declaredAtCommit=<HEAD>
```

The command is run by `pivot/src/shared/runAcceptanceGate.ts` on a **clean
checkout** of the resulting commit — `git worktree add --detach`, with only
`node_modules` symlinked in. Uncommitted edits and untracked files cannot
satisfy it.

Four rules, enforced in `pivot/src/shared/acceptanceGate.ts`:

- **Declared first.** `declaredAtCommit` must be an ancestor of the first
  implementation commit. A command written after the code is a justification.
- **Non-trivial.** `true`, `:`, `exit 0`, and bare `echo` are rejected. A gate
  that cannot fail proves nothing.
- **Non-mutating.** No `git commit/push/reset`, `rm -rf`, `npm publish`, or
  `convex deploy`. A gate must not change the tree it grades.
- **Immutable.** `declareAcceptanceCommand` refuses to overwrite an existing
  declaration.

A missing gate is reported as `rejected`, not `failed`. A missing gate is a
process problem; a red gate is a code problem. Collapsing the two is how false
completions get through.

## Track Closeout

A track may be archived only when all three conditions are met:

1. `verify` passes (all gates green, exit 0) and results are recorded in the plan.
2. The orphans report (`doctor.sh orphans`) is clean, or new entries are added to the allowlist with a tracked TD id.
3. The acceptance command passed on a clean checkout, and the evidence is stored
   in `runContracts.acceptanceEvidence`.

Do not mark a task `[x]` for Red-only work. `[x]` means the implementation landed and the stated verification is green at HEAD.

## Development Commands

```bash
bun install
npm run dev
bun run --cwd pivot test
bun --cwd pivot typecheck
bun run --cwd frontend test    # NOTE: `bun run`, not `bun`. See below.
bun --cwd frontend check
bash measure/doctor.sh all
```

`bun run --cwd frontend test` invokes the package script, which is vitest.
`bun --cwd frontend test` invokes **Bun's own test runner** against the frontend
tree, which hangs indefinitely and produces no output. `measure/verify.sh` used
the second form for its `frontend-test` gate, so that gate could never pass —
which is consistent with `.verify-skips.log` having recorded 36 bypasses and
zero passes.

## Commit Guidelines

Use focused Conventional Commit messages, such as `fix(pivot): ...`, `feat(frontend): ...`, `chore(measure): ...`, or `measure(plan): ...`. After completed source work, update `graph.db` incrementally with the changed files.
