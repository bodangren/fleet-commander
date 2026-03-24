# Conductor Workflow & Message Broker Protocol

The system is a **state-driven, batch-executed orchestration engine**. All coordination happens asynchronously through the filesystem broker.

## 1. Project Initialization & Planning (The Human)
1. **Scaffold:** The human user registers a local codebase in the Fleet Commander UI.
2. **Drafting a Track:** The human writes a `spec.md` describing a new feature.
3. **Planning & Assignment:** The human (or an Architect LLM assistant) breaks the spec down into `plan.md` tasks. Tasks are assigned dependencies, priorities, and tagged with specific Agent Personas.
    - Example: `- [ ] @frontend Build the user profile React component.` (Priority: 5)

## 2. The Orchestrator Run Lifecycle (The Dispatcher Engine)
The core logic of the Go daemon is a strictly constrained execution cycle. It can be triggered manually via the UI or run on a schedule.

**Only ONE task may be executed per orchestrator run.**

1. **Load State:** The daemon reads the persistent state (`plan.md`, `tracks.md`, and all files in `broker/open/`).
2. **Identify Candidate Tasks:** It finds all tasks marked as `ready`.
3. **Filter:**
    - Remove tasks where dependencies are not yet `done`.
    - Remove tasks marked as `blocked`.
    - Remove tasks that exceed the current allocated budget constraints.
4. **Prioritization Engine (Score & Rank):** The daemon evaluates the remaining tasks based on a composite score:
    `Score = (Priority Weight × Task Priority) + (Fit Weight × Persona Suitability) - (Cost Weight × Estimated Cost) + (Project Importance)`
5. **Dispatch:** The absolute highest-ranking task is selected. The daemon spawns the CLI tool assigned to the target persona.
6. **Execution:** The agent runs, captures output, and modifies the workspace. It finishes by updating its status in `plan.md` to `[x]` (done) or creating an Issue.
7. **Persist & Exit:** The daemon captures all execution logs, writes the final state back to disk, and gracefully exits the run loop.

## 3. The Conductor Message Broker (Inter-Agent Communication)
Because agents are not continuously running and cannot communicate in real-time, they use the Message Broker protocol to solve blockers.

### Directory Structure Extension:
```text
conductor/
├── tracks/
└── broker/
    ├── open/       # Unresolved issues
    └── resolved/   # Closed issues
```

### The Issue / Blocker Scenario:
1. **Blocker Encountered:** The `@frontend` agent is working on a task but realizes the API is missing a required field.
2. **Raising an Issue:** The agent is instructed to stop implementation and instead:
    - Mark its current task as `[Blocked]` in `plan.md`.
    - Create a structured issue file in `conductor/broker/open/` (e.g., `issue-123-api-error.md`).
    - Inside the file, describe the blocker and assign the issue to `@backend`.
3. **Next Run (Re-Prioritization):** On the next Orchestrator Run, the Dispatcher engine parses `broker/open/issue-123-api-error.md`. It automatically synthesizes a high-priority task for the `@backend` agent to resolve the issue.
4. **Resolution:** The `@backend` agent is dispatched, fixes the code, and moves the issue file from `broker/open/` to `broker/resolved/`.
5. **Unblocking:** On the subsequent run, the Dispatcher sees the issue is resolved, removes the `[Blocked]` flag from the `@frontend` task, and makes it `ready` for selection again.

## 4. Human Intervention & Review
The system does not run continuously unless a human sets a "cron" schedule. The human acts as the ultimate authority to:
- Review the `broker/open/` directory and manually resolve issues if an agent hallucinates.
- Adjust Task Priorities and Budgets in the UI to heavily influence the Dispatcher's scoring algorithm.
- Approve final feature merges before a Track is considered complete.
