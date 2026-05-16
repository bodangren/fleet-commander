# Product Definition - Fleet Commander

## Vision

Fleet Commander is a **virtual software house**.

You run a company of AI employees who work on client projects through Scrum boards. Create projects, plan sprints, write task specs, and assign work to your team. Your employees pick up tasks automatically, do the work, and move cards across the board. You are the engineering manager with full visibility into who is doing what.

## Target Audience

Solo developers and small teams who want to manage AI agents as a real engineering team — without the complexity of enterprise orchestration platforms.

## Core Concepts

- **Projects**: Client work with dedicated Scrum boards and sprints.
- **Sprints**: Time-boxed iterations (typically 1-2 weeks).
- **Tasks**: Spec-driven work items. Not limited to coding — include research, design, testing, documentation, DevOps, etc.
- **Employees**: AI agent personas with skills, preferred models, and workload limits.
- **Board**: Kanban columns. Default: Backlog → Ready → In Progress → Review → Done.
- **Runs**: Execution logs of what an employee did on a task.

## How It Works

1. **Plan**: Create a project, start a sprint, and add tasks with specs.
2. **Assign**: Assign tasks to employees or leave them for auto-assignment.
3. **Execute**: The scheduler picks up Ready tasks and dispatches them to available employees.
4. **Review**: Completed tasks land in Review. You approve or send them back.
5. **Ship**: Close the sprint, archive completed work.

## Principles

- **Visibility first**: The board is the primary interface. If you can't see it, you can't manage it.
- **Human in the loop**: You approve work before it ships. AI executes; you decide.
- **Simple by default**: No scoring algorithms, no broker protocols, no complex state machines. Just tasks, people, and a board.
- **Approachable**: A new user should understand the whole system in 5 minutes.

## Runtime Architecture

- **Convex**: Canonical state for projects, sprints, tasks, employees, and run history.
- **Bun**: Local HTTP server + cron scheduler for task execution.
- **React**: Single-page kanban dashboard.

## What's Gone (Retired)

The following concepts from the previous orchestration-control-plane iteration have been removed:

- Dispatcher scoring algorithms and "only one task per run" constraints
- Message broker protocol with open/resolved issue files
- 20+ page operational dashboard
- Harness management abstraction (replaced by simple employee configs)
- Enterprise features: multi-tenancy, RBAC, encryption, observability stacks
