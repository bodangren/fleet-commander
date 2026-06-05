# Plan: Project Template Marketplace

## Phase 1: Pure Functions & Tests
- [x] Task: Write `instantiateProjectFromTemplate` pure function: create project struct, map template tasks, compute budget recommendation
- [x] Task: Write `instantiateProjectFromTemplate` tests: valid template, empty template, budget rounding
- [x] Task: Write `extractTemplateFromProject` pure function: strip content, preserve structure, anonymize agents
- [x] Task: Write `extractTemplateFromProject` tests: full project, minimal project, agent name scrubbing
- [x] Task: Write `recommendBudget` pure function: sum story points × agent cost/point from template defaults
- [x] Task: Write `recommendBudget` tests: single agent, multiple agents, missing cost data
<!-- Phase 1 complete: commit d9116ed -->

## Phase 2: Schema & Backend
- [x] Task: Add `projectTemplates` table to Convex schema with validation
- [x] Task: Add CRUD mutations: `createProjectTemplate`, `deleteProjectTemplate`, `instantiateProject`
- [x] Task: Add `getProjectTemplates` and `getProjectTemplateById` queries
- [x] Task: Seed built-in templates via migration script
- [x] Task: Write Convex tests for CRUD and instantiation
<!-- Phase 2 complete: commit 4b4046d -->

## Phase 3: UI Components
- [x] Task: Build `/templates` gallery route: grid of template cards with search/filter
- [x] Task: Build `TemplateCard` component: name, category, task count, estimated budget
- [x] Task: Build `TemplateDetailModal` component: task preview, agent list, budget, create button
- [x] Task: Build "Create from Template" flow in new project modal
- [x] Task: Build "Save as Template" action on project settings page
- [x] Task: Add Templates link to main navigation
<!-- Phase 3 complete: commit b0743a3 -->

## Phase 4: Verification
- [ ] Task: Manual test: create project from "Web App" template, verify tasks in backlog
- [ ] Task: Manual test: save existing project as template, verify content stripped
- [ ] Task: Verify built-in templates appear for new workspaces
- [~] Task: Run full test suite
- [ ] Task: Commit and push

<!--
Phase 4 verification run (2026-06-05):
- Convex suite: 675 pass / 0 fail (incl. 86 project-template tests in 3 files).
- Frontend template tests (TemplateCard, TemplateDetailModal, ProjectTemplatesPage,
  CreateProjectFromTemplateModal, SaveAsTemplateModal): 67 pass / 0 fail.
- Frontend full suite: 819 pass / 9 fail across 3 files.
  - **5 failures in `src/layout/AppLayout.test.tsx`** are blocking for this track.
    Sidebar label is `"Templates"` (AppLayout.tsx:67) but tests require
    `"Project Templates"` to disambiguate from `/agent-templates`. Phase 3 task
    "Add Templates link to main navigation" was marked [x] but the contract is
    not satisfied. See TD-232.
  - 4 failures in `DashboardPage.layout.test.tsx` / `useDashboardData.test.ts` are
    pre-existing and unrelated (no working-tree changes to those source files;
    BurnForecastCard rendering bug).
- Phase 4 test strategy §1 says "No new automated tests; Manual + Regression."
  Templated Red-phase instruction was inapplicable; see TD-231.
- Phase 4 cannot complete until TD-232 is resolved (fix label in AppLayout.tsx).
-->
