# Specification - Go Backend - Orchestrator Engine & Priorities

## 1. Goal
Implement the core logic that makes Fleet Commander an "orchestrator" rather than just a task list. This engine is responsible for evaluating the state of a project, deciding what the most important next action is, and kicking off the lifecycle to execute it.

## 2. Context
The fundamental paradigm of this system is that **only one task executes at a time per project**. We need a deterministic, rule-based engine that can look at a messy, human-written `plan.md` file and mathematically determine the best next step based on dependencies, priorities, and assigned personas.

## 3. Architecture & Data Flow
- **Trigger:** The engine can be triggered manually (via the UI) or eventually by a cron scheduler.
- **Evaluation Phase:** 
  - The engine requests the current, fully parsed `Project` state from the `ProjectManager`.
  - It filters out completed tasks, blocked tasks, and tasks whose preceding dependencies in the markdown list are not yet complete.
  - It scores the remaining tasks.
- **Execution Phase:**
  - It locks the project state to prevent concurrent runs.
  - It passes the winning task to the CLI Runner (to be implemented in the next track).
- **Post-Execution Phase:**
  - It receives the result.
  - It physically mutates the `plan.md` file on disk (changing `[ ]` to `[x]`).
  - It releases the lock.

## 4. Prioritization Logic Details
The `ScoreTask` function needs to be robust but start simple:
- Baseline score is 10 for any ready task.
- Tasks explicitly marked high priority in the text get +50.
- If we later add budget tracking, expensive personas (like a senior architect prompt using an expensive model) might get a negative modifier if budget is tight.
- **Tie-breaker:** If scores are equal, prefer tasks higher up in the markdown file, as they logically precede later items in the plan.