# Virtual Software House MVP — Implementation Plan

## Phase 1: Simplify the Schema

- [ ] Audit current Convex schema and identify tables to keep, modify, or remove
- [ ] Design new minimal schema: projects, sprints, boards, columns, tasks, employees, runs
- [ ] Remove obsolete tables and functions (dispatcher state, broker issues, scoring)
- [ ] Write migration script to preserve useful existing data
- [ ] Seed demo project with sample tasks and employees
- [ ] Verify Convex types generate cleanly

## Phase 2: Build the Kanban Board

- [ ] Create main layout: sidebar (projects) + board area
- [ ] Build kanban column component with task cards
- [ ] Implement drag-and-drop between columns
- [ ] Build task detail modal (title, description, assignee, priority, spec)
- [ ] Add task creation and editing
- [ ] Add project selector in sidebar
- [ ] Style with Tailwind — clean, minimal, approachable
- [ ] Verify responsive behavior (tablet-friendly)

## Phase 3: Employee Roster

- [ ] Create employees list view
- [ ] Build employee detail card (name, role, skills, model, workload)
- [ ] Add assign/unassign task flow
- [ ] Show workload indicators on employee cards
- [ ] Add employee status toggle (Active / Away)

## Phase 4: Auto-Execution

- [ ] Simplify pivot scheduler: query Ready tasks + available employees
- [ ] Match task to employee by skills (simple tag intersection)
- [ ] Run employee CLI tool with task context via Bun.spawn
- [ ] Capture stdout/stderr into run logs
- [ ] Update task status on success (Done) or failure (Blocked)
- [ ] Add basic retry logic (max 3 attempts before Blocked)
- [ ] Test end-to-end with a simple task

## Phase 5: Polish & Quality Gates

- [ ] Run full test suite: bun --cwd pivot test && bun --cwd frontend test
- [ ] Run type checks: bun --cwd pivot typecheck && bun --cwd frontend check
- [ ] Run lint: npm run lint
- [ ] Update measure/index.md with new project context
- [ ] Write a brief user guide in measure/user-guide.md
- [ ] Manual verification: create project, add task, assign employee, run scheduler, approve task
