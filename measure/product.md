# Product Definition - Fleet Commander

## Vision

Fleet Commander is a **virtual software house**.

You run a company of AI agents who work on client projects through budget-constrained sprints. Create projects, estimate tasks with story points, set budgets, and trigger sprints. Your agents plan, execute, review, and merge work automatically. You are the engineering manager with full visibility into costs, performance, and delivery.

## Target Audience

Solo developers and small teams who want to manage AI agents as a real engineering team — without the complexity of enterprise orchestration platforms.

## Core Concepts

- **Projects**: Client work with dedicated Scrum boards and sprints.
- **Sprints**: Budget-constrained iterations. Money is the scarce resource, not time. A sprint ends when the budget is exhausted or all tasks are complete.
- **Tasks**: Spec-driven work items with story points for relative difficulty. Not limited to coding — include research, design, testing, documentation, DevOps, etc.
- **Story Points**: Relative difficulty estimation. Combined with agent cost/point, this determines task cost.
- **Agents**: AI personas with roles (Architect, Executor, Reviewer, Merger), skills, preferred models, and cost profiles.
- **Pipeline**: Canonical execution flow: Dispatch -> Executor -> optional quality stages -> Reviewer -> Merger.
- **Budget**: Dollar amount allocated per sprint. Estimated from historical cost/point × assignee. The human sets and approves the budget.

## How It Works

### Sprint Planning
1. **PM Agent recommends tasks** based on priority, agent availability, and historical cost data.
2. **Human reviews the plan** — sees task list, story points, cost estimates per agent, total estimated cost.
3. **Human sets budget** — approves or adjusts the dollar amount.
4. **Human triggers the sprint** — clicks "Start Sprint" when ready.

### Execution
1. **AutoRunner dispatches** Ready tasks when continuous mode is enabled.
2. **Executor agent** performs the implementation work and records run output.
3. **Configured quality stages** should run inside the executor dispatch for non-none quality profiles.
4. **Reviewer agent** validates quality, approves or rejects.
5. **Merger agent** merges approved work.
6. **Costs accrue** in real-time against the sprint budget.

### Completion
- **Sprint ends** when budget is exhausted or all tasks are complete.
- **Metrics are recorded** — cost/point, rejection rate, delivery rate.
- **History is updated** — sprint, agent, and task records.

## Agent Roles

| Role | Responsibility | Typical Agent |
|------|---------------|---------------|
| **Architect** | Plans implementation approach | Senior dev (@alice) |
| **Executor** | Writes code, runs tests, commits | Worker agents (@bob, @frank) |
| **Reviewer** | Validates quality, approves/rejects | Dedicated reviewer (@carol) |
| **Merger** | Merges approved PRs | Senior dev (@alice) |

## Kanban Columns

| Column | Meaning | Who moves it |
|--------|---------|--------------|
| **Backlog** | Not in current sprint | Human (planning) |
| **Ready** | In sprint, waiting for AutoRunner dispatch | Human (planning) |
| **In Progress** | Agent actively working | AutoRunner (auto) |
| **For Review** | Work complete, awaiting agent review | Executor agent (auto) |
| **Merged** | Approved and merged by reviewer agent | Merger agent (auto) |

**Blocked** is a tag on In Progress cards, not a separate column. When cleared, work resumes.

**Rejected** tasks return to Ready for reassignment.

## Cost Model

- **Cost per story point** is the fundamental efficiency metric.
- Each agent has a cost profile based on their LLM model, typical duration, and retry rate.
- **Sprint cost estimate** = Σ (story points × agent cost/point).
- **Budget burndown** tracks actual spend vs remaining budget.
- **Cost/point trend** shows efficiency improvements over time.

## Principles

- **Money is the scarce resource**: Sprints are budget-constrained, not time-constrained. Unlimited parallelism is possible if budget allows.
- **Human decides, agents execute**: The human prioritizes tasks, sets budgets, and triggers sprints. Agents handle planning, execution, review, and merge.
- **Visibility first**: The dashboard shows real-time budget status, agent activity, and pipeline progress.
- **Cost efficiency matters**: Track cost/point, optimize agent assignments, and prefer models that deliver reliable throughput under budget.
- **Full autonomy**: Agents plan, manage, orchestrate, execute, review, and merge. No human intervention in the pipeline.

## User Roles

| Role | What they do |
|------|-------------|
| **Engineering Manager** (Human) | Prioritizes tasks, sets budgets, triggers sprints, reviews deliverables |
| **PM Agent** | Recommends sprint plans, estimates costs, generates retrospectives |
| **Data Analyst** | Analyzes metrics, surfaces insights, recommends optimizations |
| **Architect Agent** | Plans implementation approach for tasks |
| **Executor Agent** | Writes code, runs tests, commits changes |
| **Reviewer Agent** | Validates quality, approves or rejects work |
| **Merger Agent** | Merges approved PRs |

## Dashboard Views

### Overview
- **Dashboard**: Current sprint status, key metrics, agent activity, attention needed
- **Blockers**: Tasks waiting on dependencies, resource conflicts

### Team
- **Agents**: Agent roster with skills, roles, workload, cost profiles
- **Providers**: LLM providers, model assignments, status

### Work
- **Project Board**: Kanban with budget tracking, cost per card, story points
- **Sprint Planning**: PM agent recommendations, task selection, budget input
- **Pipelines**: Execution history with executor, reviewer, merger attribution
- **Task Timeline**: 5-stage pipeline visualization for individual tasks

### Insights
- **Analytics**: Sprint velocity, cost efficiency, delivery metrics
- **Performance**: Agent reliability, pipeline cost breakdown, rejection analysis
- **Costs**: Budget tracking, cost/point trends, ROI analysis, optimization opportunities

### Operations
- **Monitor**: Real-time system pulse, queue depth, agent status
- **Diagnose**: Reconcile drift, audit trail, root cause analysis
- **Optimize**: Policy weights, cost experiments, provider health (A/B testing and policy-simulation UIs were removed; do not reintroduce without a product decision)

### History
- **Sprints**: Past sprints with metrics, velocity trends, retrospectives
- **Agents**: Agent performance over time, model changes, cost evolution
- **Tasks**: Full task lifecycle, pipeline runs, audit trail

### System
- **Settings**: Application configuration, notification preferences

## Runtime Architecture

- **Convex**: Canonical state for projects, sprints, tasks, agents, and run history.
- **Bun**: Local HTTP server + AutoRunner continuous scheduling loop for task execution. The canonical Bun orchestrator (`pivot/src/orchestrator/`) is the **only production scheduler** — it owns task selection, continuous scheduling, Convex persistence, budget reservations, retries, circuit breakers, notifications, Git lifecycle, and quality-workflow stage execution.
- **React**: Single-page kanban dashboard with cost-based tracking.

## Quality Workflow

The canonical orchestrator has configurable quality-workflow profiles (`none`, `standard`, `strict`) that nest quality stages (strategy, Red, Green, phase acceptance, adversarial audit, UX review, final acceptance, track closeout) inside executor dispatch. Quality stages do not independently select or claim work; they run within the existing task run.

**Production wiring:** AutoRunner is supplied with `createProductionQualityWorkflowHooks()` from the Bun server and CLI entrypoints. Non-none profiles execute through the real runner path (fail closed if hooks are omitted). Human-facing configure/observe/diagnose UI residual is tracked by `measure/tracks/quality_workflow_visibility_ui_20260807/` (TD-261).

The legacy Python supervisor (`measure/automation-supervisor.py`) is a **deprecated behavioral reference** (see `measure/DEPRECATED.md`). It is not a production scheduler and must not be spawned by production code.

**Executor backend:** Pi measure harness only. The OpenCode SDK executor path and the experimental A/B testing / policy-simulation subsystems were removed on the scalpel branch.

## What's Changed (Previous Iteration)

The following concepts have been retired or replaced:

- **Time-boxed sprints** → Budget-constrained sprints
- **Human approval in pipeline** → Fully agentic pipeline (agents review and merge)
- **Done column** → Merged column (reflects code merge, not just completion)
- **Blocked column** → Blocked tag on In Progress cards
- **Simple scheduler** → 5-stage pipeline with agent roles
- **No cost tracking** → Cost per story point, budget burndown, ROI analysis
- **No optimization** → Cost/point tracking, policy weights, provider health (A/B product surface later removed on scalpel)
- **Dual executor / OpenCode path** → Single Pi measure harness executor (scalpel)
- **Parallel YAML pipeline engine** → Removed; canonical Bun AutoRunner only
