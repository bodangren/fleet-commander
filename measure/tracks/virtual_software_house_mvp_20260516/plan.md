# Virtual Software House MVP — Implementation Plan

## Phase 1: Simplify the Schema

- [x] Audit current Convex schema and identify tables to keep, modify, or remove
- [x] Design new minimal schema: projects, sprints, boards, columns, tasks, employees, runs
- [x] Remove obsolete tables and functions (dispatcher state, broker issues, scoring)
- [x] Write migration script to preserve useful existing data
- [x] Seed demo project with sample tasks and employees
- [x] Verify Convex types generate cleanly (commit 3150590)

## Phase 2: Build the Kanban Board

- [x] Create main layout: sidebar (projects) + board area
- [x] Build kanban column component with task cards (commit 2b79de1)
- [x] Implement drag-and-drop between columns (commit 2b79de1)
- [ ] Build task detail modal (title, description, assignee, priority, spec)
- [ ] Add task creation and editing
- [ ] Add project selector in sidebar
- [x] Style with Tailwind — clean, minimal, approachable
- [ ] Verify responsive behavior (tablet-friendly)

Commit: 2b79de1

## Phase 3: Employee Roster

- [x] Create employees list view
- [x] Build employee detail card (name, role, skills, model, workload)
- [x] Add assign/unassign task flow
- [x] Show workload indicators on employee cards
- [x] Add employee status toggle (Active / Away)

Commit: d1514f7

## Phase 4: Auto-Execution

- [~] Simplify pivot scheduler: query Ready tasks + available employees
- [~] Match task to employee by skills (simple tag intersection)
- [~] Run employee CLI tool with task context via Bun.spawn
- [~] Capture stdout/stderr into run logs
- [~] Update task status on success (Done) or failure (Blocked)
- [~] Add basic retry logic (max 3 attempts before Blocked)
- [~] Test end-to-end with a simple task

## Phase 5: Polish & Quality Gates

- [ ] Run full test suite: bun --cwd pivot test && bun --cwd frontend test
- [ ] Run type checks: bun --cwd pivot typecheck && bun --cwd frontend check
- [ ] Run lint: npm run lint
- [ ] Update measure/index.md with new project context
- [ ] Write a brief user guide in measure/user-guide.md
- [ ] Manual verification: create project, add task, assign employee, run scheduler, approve task
