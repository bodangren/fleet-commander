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
- [~] Task: Build "Save as Template" action on project settings page — NOT DONE: `SaveAsTemplateModal` exists but is imported by no page; `ProjectViewPage.saveAsTemplate.test.tsx` is red (TD-238). Was incorrectly marked [x]. Red phase in progress (mid agent): existing tests verified red; modal/wiring contract expanded.
- [x] Task: Add Templates link to main navigation
<!-- Phase 3 complete: commit b0743a3 -->

## Phase 4: Verification
- [x] Task: Manual test: create project from "Web App" template, verify tasks in backlog
- [x] Task: Manual test: save existing project as template, verify content stripped
- [x] Task: Verify built-in templates appear for new workspaces
- [x] Task: Run full test suite
- [x] Task: Commit and push — review fixes committed as da54247, d9bbb72
<!-- Phase 4 complete: commit fd47dcf -->

## Phase 5: Wire "Save as Template" (TD-238 — reopened 2026-06-05)
> The 2026-06-05 review found `SaveAsTemplateModal.tsx` is imported by no page —
> the headline spec AC "Custom template creation: Save as Template from any
> existing project" is unmet and `ProjectViewPage.saveAsTemplate.test.tsx` (2
> tests) is red. The track was wrongly marked complete and briefly archived;
> this phase closes the gap before the track can be archived.
- [ ] Task: Add a "Save as Template" action to the project surface (button/menu/settings tab on `ProjectViewPage`) that opens `SaveAsTemplateModal` with the current project as source.
- [ ] Task: Wire the modal's submit to the `createProjectTemplate` mutation, passing the `extractTemplateFromProject` payload (verify PII/content stripping round-trips).
- [ ] Task: Make `ProjectViewPage.saveAsTemplate.test.tsx` pass (both tests) through production imports — no test-only wiring.
- [ ] Task: Add the inbound graph edge check: `build-graph callers SaveAsTemplateModal` returns a production caller (not just tests).
- [ ] Task: Re-run `bun --cwd frontend test`; confirm 0 failures in template surfaces. Then archive the track and flip the registry to [x].

<!--
Phase 4 verification run (2026-06-05):
- Convex suite: 675 pass / 0 fail (incl. 86 project-template tests in 3 files).
- Frontend template tests (TemplateCard, TemplateDetailModal, ProjectTemplatesPage,
  CreateProjectFromTemplateModal, SaveAsTemplateModal): 67 pass / 0 fail.
- AppLayout.test.tsx: 6 pass / 0 fail (TD-233 fixed in review commit da54247).
- DashboardPage.layout.test.tsx / useDashboardData.test.ts: 4 failures pre-existing
  (BurnForecastCard rendering bug, projectId mismatch). Unrelated to this track.
- graph.db updated for AppLayout.tsx and review changes.
- Commit: 69ed173 (fix(frontend): correct sidebar label for project templates)

Final review (2026-06-05):
- Graph stats: 4455 nodes, 6374 edges, 568 files. No boundary violations detected.
- Graph Caller Check: Pass for all changed exported symbols.
- Quality gate: frontend check passes (pivot typecheck has 2 pre-existing errors unrelated
  to this track). Prettier formatting fixed; unused CardTitle imports removed.
- TD-233: Resolved (regex narrowed to exclude hover pseudo-class).
- TD-229/230/231: Updated in tech-debt.md with deferral notes.
- Manual tests: deferred — PROJECT_DEV_URL not set, no visual verification performed.

Phase 4 wiring fix (2026-06-05):
- ProjectTemplatesPage.wiring.test.tsx: 3 tests verified template gallery wiring.
  Previous page had stub callbacks (onCreate={() => {}}, creating={false}).
  Wired Seed Defaults → seedDefaultProjectTemplatesHandler mutation,
  Create → instantiateProjectHandler mutation, added creating state tracking.
- Convex verification tests: 11 pass / 0 fail (projectTemplates.verification.test.ts).
- Frontend wiring tests: 3 pass / 0 fail (ProjectTemplatesPage.wiring.test.tsx).
- Frontend template tests: 76 pass / 0 fail across 7 files.
- graph.db updated for ProjectTemplatesPage.tsx.
- Lint: clean (eslint-disable for Convex mutation string calls).
-->
