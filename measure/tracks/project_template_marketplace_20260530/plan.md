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
<!-- Phase 2 complete: commit pending -->

## Phase 3: UI Components
- [ ] Task: Build `/templates` gallery route: grid of template cards with search/filter
- [ ] Task: Build `TemplateCard` component: name, category, task count, estimated budget
- [ ] Task: Build `TemplateDetailModal` component: task preview, agent list, budget, create button
- [ ] Task: Build "Create from Template" flow in new project modal
- [ ] Task: Build "Save as Template" action on project settings page
- [ ] Task: Add Templates link to main navigation

## Phase 4: Verification
- [ ] Task: Manual test: create project from "Web App" template, verify tasks in backlog
- [ ] Task: Manual test: save existing project as template, verify content stripped
- [ ] Task: Verify built-in templates appear for new workspaces
- [ ] Task: Run full test suite
- [ ] Task: Commit and push
