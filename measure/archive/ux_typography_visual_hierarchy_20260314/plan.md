# Implementation Plan - Typography & Visual Hierarchy

## Phase 1: Typography Scale [checkpoint: 7e394a0]

Increase base font sizes and establish clear hierarchy.

- [x] Task: Update index.css with new type scale variables [bbb6a3c]
  - [x] Write visual regression tests (optional)
  - [x] Define CSS custom properties for font sizes
- [x] Task: Replace `text-xs` with `text-sm` in body content [b7f005f]
  - [x] Audit all uses of `text-xs` in components
  - [x] Update App.tsx, BoardPanel.tsx, PlanDetailPanel.tsx
- [x] Task: Measure - User Manual Verification 'Phase 1: Typography Scale' [7e394a0]

## Phase 2: Color System

Introduce accent colors and status-specific color coding.

- [ ] Task: Define color tokens in index.css
  - [ ] Add status-specific color variables (todo, in_progress, done)
  - [ ] Define accent color for primary actions
- [ ] Task: Apply status colors to BoardView task cards
  - [ ] Add colored left border or badge per status
  - [ ] Update status indicator styling
- [ ] Task: Apply accent color to primary buttons and actions
  - [ ] Update Button variants if needed
  - [ ] Style "Run Agent" and key action buttons
- [ ] Task: Measure - User Manual Verification 'Phase 2: Color System'

## Phase 3: Container Styling

Replace dashed borders and add depth.

- [ ] Task: Replace `border-dashed` with solid borders
  - [ ] Update BoardPanel, PlanDetailPanel, AgentTemplatesPanel
  - [ ] Use subtle shadows for elevated panels
- [ ] Task: Standardize border radius
  - [ ] Use `rounded-lg` consistently
  - [ ] Update card and panel components
- [ ] Task: Measure - User Manual Verification 'Phase 3: Container Styling'

## Phase 4: Spacing Standardization

Apply consistent spacing throughout.

- [ ] Task: Audit and fix spacing inconsistencies
  - [ ] Review all `space-y-*` and `gap-*` usage
  - [ ] Standardize on gap-2, gap-4, gap-6 pattern
- [ ] Task: Ensure consistent padding in cards and panels
  - [ ] Update BoardView task cards
  - [ ] Update sidebar navigation
- [ ] Task: Measure - User Manual Verification 'Phase 4: Spacing Standardization'
