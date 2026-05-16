# Fleet Commander Workflow

## Sprint Lifecycle

### 1. Planning (Human)
1. Create or select a project.
2. Start a new sprint.
3. Add tasks to the sprint backlog with specs and acceptance criteria.
4. Estimate tasks and set priorities.
5. Assign tasks to employees or leave them unassigned for auto-pickup.

### 2. Execution (Automated)
1. The scheduler runs on a cron (e.g., every 5 minutes).
2. It finds tasks in **Ready** status with no blockers.
3. It picks an available employee (not over their workload limit).
4. It runs the employee's configured CLI tool with the task context.
5. The employee executes the task, commits changes, and updates the task status:
   - **Done** if successful
   - **Blocked** if it hit an issue it can't resolve
6. Execution output is captured in a **Run** log.

### 3. Review (Human)
1. Check the **Review** column daily.
2. Open the task and read the run log / diff.
3. Approve (move to **Done**) or request changes (move back to **Ready**).
4. If a task is blocked, read the blocker note and either fix it yourself or reassign.

### 4. Ship (Human)
1. When the sprint ends, review the Done column.
2. Close the sprint.
3. Archive completed tasks.

## Task States

| State | Meaning |
|-------|---------|
| Backlog | Not in current sprint |
| Ready | In sprint, waiting for an employee |
| In Progress | Employee is actively working |
| Review | Done, waiting for human approval |
| Done | Approved and complete |
| Blocked | Has unresolved dependencies or errors |

## Task Format

Tasks should be spec-driven. Include:

```markdown
## Task: Add user authentication

- **Assignee**: @backend-dev
- **Priority**: High
- **Estimate**: 2 hours
- **Acceptance Criteria**:
  - [ ] Users can register with email/password
  - [ ] Passwords are hashed with bcrypt
  - [ ] JWT token returned on login
```

## Quality Gates (Per Task)

Before approving a task in Review:
- [ ] Implementation matches the spec
- [ ] Tests pass (if the task includes code)
- [ ] No obvious security issues
- [ ] Commits follow Conventional Commits

## Employee Configuration

Employees are configured in Convex. Each employee has:

- **Name** and **Role** (e.g., "Alice — Frontend Developer")
- **Skills** (tags like `react`, `convex`, `testing`)
- **Model / CLI tool** (e.g., `claude`, `opencode -m gpt-4`)
- **Workload limit** (max concurrent tasks, default 1)
- **Status** (Active, Busy, Away)

## Automation Script

The scheduler is a simple cron script (`measure/automation-script.sh`):

1. Query Convex for Ready tasks
2. Query Convex for available employees
3. Match task skills to employee skills
4. Run the employee's CLI tool with the task spec
5. Capture output and update task status

No scoring algorithm. No broker protocol. Just matching and execution.

## Development Commands

### Setup
```bash
bun install
npx convex dev
```

### Daily Development
```bash
npm run dev          # Starts convex + pivot + frontend
bun --cwd pivot dev  # Backend only
bun --cwd frontend dev # Frontend only
```

### Before Committing
```bash
npm run lint
bun --cwd pivot typecheck
bun --cwd frontend check
bun --cwd pivot test
bun --cwd frontend test
```

## Commit Guidelines

Use Conventional Commits with scopes:
- `feat(ui): ...`
- `fix(convex): ...`
- `chore(measure): ...`
- `measure(plan): ...`
