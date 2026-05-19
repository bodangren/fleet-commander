# Implementation Plan: UI Redesign — Linear Design System

## Phase 1: Design Tokens & Global Styles
- [ ] Update `frontend/src/index.css` with Linear color tokens
- [ ] Update Tailwind config (if needed) for Linear colors/fonts
- [ ] Update `frontend/src/components/ui/button.tsx` with Linear styles
- [ ] Update `frontend/src/components/ui/card.tsx` with Linear styles
- [ ] Update `frontend/src/components/ui/input.tsx` with Linear styles
- [ ] Update `frontend/src/components/ui/label.tsx` with Linear styles

## Phase 2: Layout (AppLayout)
- [ ] Rewrite sidebar with grouped sections and 240px width
- [ ] Rewrite header/topbar to 56px minimal style
- [ ] Update navigation links to match mockup structure
- [ ] Add History section to sidebar
- [ ] Remove cyberpunk styling (thick borders, shadows, italics)

## Phase 3: Dashboard Page
- [ ] Add SprintStatus panel with budget/progress
- [ ] Add KeyMetrics panel
- [ ] Add AgentStatus list
- [ ] Add AttentionNeeded alerts
- [ ] Add RecentActivity feed

## Phase 4: Project Board (Kanban)
- [ ] Add sprint selector chips
- [ ] Add budget burndown section
- [ ] Implement kanban columns: Backlog, Ready, In Progress, For Review, Merged
- [ ] Style task cards to match mockup

## Phase 5: Sprint Planning Page
- [ ] Create SprintPlanning page component
- [ ] Add project/budget selectors
- [ ] Add PM agent recommendation panel
- [ ] Add task selection table
- [ ] Add agent cost breakdown
- [ ] Add route in App.tsx

## Phase 6: History Pages
- [ ] Create SprintsHistory page
- [ ] Create AgentsHistory page  
- [ ] Create TasksHistory page
- [ ] Add routes in App.tsx
- [ ] Add sidebar navigation

## Phase 7: Remaining Pages
- [ ] Update Agents page to match Linear aesthetic
- [ ] Update Providers page to match Linear aesthetic
- [ ] Update Settings page to match Linear aesthetic
- [ ] Update all other pages (Pipelines, Analytics, Performance, Costs, Ops, etc.)

## Phase 8: Verification
- [x] Run frontend tests: `bun --cwd frontend test` (DashboardPage tests pass; pre-existing failures in other tests)
- [x] Run typecheck: `bun --cwd frontend check` (pre-existing TS errors in unrelated files)
- [x] Run linter: `npm run lint` (pre-existing lint errors in unrelated files)
- [x] Manual verification in browser