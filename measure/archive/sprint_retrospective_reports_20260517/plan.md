# Implementation Plan: Sprint Retrospective Reports

## Phase 1: Retrospective Data Model

- [ ] **Task: Define retrospective schema**
  - [ ] Create `sprintRetrospectives` table in `convex/schema.ts`
  - [ ] Fields: `sprintId`, `projectId`, `generatedAt`, `completedTasks`, `carryOverTasks`, `velocityDelta`, `blockerSummary`, `employeeContributions`, `recommendations`
  - [ ] Add index on `(projectId, sprintId)`
- [ ] **Task: Implement `generateRetrospective` mutation**
  - [ ] Query all tasks in the sprint
  - [ ] Categorize by status: done, carry-over, blocked
  - [ ] Compute velocity (story points or task count vs previous sprint)
  - [ ] Aggregate blocker data from run failure logs
  - [ ] Generate recommendations based on patterns
- [ ] **Task: Wire into sprint close flow**
  - [ ] Call `generateRetrospective` when sprint status changes to "closed"
  - [ ] Handle generation failures gracefully (retry, log error)
- [ ] **Task: Verify Phase 1**
  - [ ] Run `bun --cwd pivot test` — all pass
  - [ ] Run `bun --cwd pivot typecheck` — passes

## Phase 2: Employee Contribution Breakdown

- [ ] **Task: Compute per-employee metrics**
  - [ ] Tasks completed per employee
  - [ ] Average completion time per employee
  - [ ] Tasks returned from review per employee
  - [ ] Blockers encountered per employee
- [ ] **Task: Add to retrospective document**
  - [ ] `employeeContributions` field with per-employee breakdown
  - [ ] Sort by contribution volume
- [ ] **Task: Write tests**
  - [ ] Test with single employee
  - [ ] Test with multiple employees
  - [ ] Test with no completed tasks (empty sprint)

## Phase 3: Frontend Retrospective View

- [ ] **Task: Create `SprintRetrospective` component**
  - [ ] Summary header: sprint name, dates, completion rate
  - [ ] Completed tasks list with employee assignments
  - [ ] Carry-over section with reasons
  - [ ] Velocity chart (bar chart comparing last 3 sprints)
  - [ ] Blocker summary with frequency
  - [ ] Recommendations list
- [ ] **Task: Add to SprintDetailPage**
  - [ ] "Retrospective" tab appears after sprint close
  - [ ] Fetch via `useQuery(getSprintRetrospective)`
  - [ ] Loading and error states
- [ ] **Task: Write frontend tests**
  - [ ] Component renders with mock retrospective data
  - [ ] Velocity chart displays correctly
  - [ ] Empty state shows "No retrospective generated yet"

## Phase 4: Recommendations Engine

- [ ] **Task: Implement pattern-based recommendations**
  - [ ] If velocity dropped >20%: "Consider reducing sprint scope"
  - [ ] If carry-over >30%: "Tasks may be too large; consider splitting"
  - [ ] If blocker rate >15%: "Review task specs for clarity before next sprint"
  - [ ] If single employee did >50% of work: "Workload imbalance detected"
- [ ] **Task: Write recommendation tests**
  - [ ] Each pattern triggers correct recommendation
  - [ ] No false positives with healthy sprint data
- [ ] **Task: Verify Phase 4**
  - [ ] Run `bun --cwd frontend test` — all pass
  - [ ] Run `bun --cwd frontend check` — passes

## Phase 5: Finalize

- [ ] **Task: Update tech-debt.md**
- [ ] **Task: Update lessons-learned.md**
- [ ] **Task: Commit and push**
