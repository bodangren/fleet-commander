# Implementation Plan - Information Architecture Refactor

## Phase 1: Navigation Restructure

Improve Settings discoverability and header utility.

- [ ] Task: Add Settings icon to header area
  - [ ] Write tests for header navigation
  - [ ] Create Header component with settings link
  - [ ] Remove Settings from sidebar bottom
- [ ] Task: Display current project path in header
  - [ ] Write tests for project path display
  - [ ] Add project path indicator with copy button
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Navigation Restructure'

## Phase 2: Board/Tracks Consolidation

Merge or clarify the relationship between Board and Tracks.

- [ ] Task: Analyze usage patterns and decide on consolidation approach
  - [ ] Document decision in tech-debt.md or product.md
  - [ ] Get user confirmation on approach
- [ ] Task: Implement consolidated view or Focus Mode
  - [ ] Write tests for new view structure
  - [ ] Update routing and navigation
  - [ ] Remove or repurpose redundant tab
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Board/Tracks Consolidation'

## Phase 3: Resizable Panels

Make sidebar and detail panels adjustable.

- [ ] Task: Add resize handle to sidebar
  - [ ] Write tests for resizable sidebar
  - [ ] Implement drag-to-resize with min/max constraints
  - [ ] Persist width preference
- [ ] Task: Add resize handle to PlanDetailPanel
  - [ ] Write tests for resizable panel
  - [ ] Implement drag-to-resize
  - [ ] Add collapse/expand toggle
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Resizable Panels'

## Phase 4: Context Indicators

Add breadcrumbs and context visibility.

- [ ] Task: Add breadcrumb navigation
  - [ ] Write tests for breadcrumb component
  - [ ] Show Project > Track > Phase hierarchy
  - [ ] Make each level clickable for navigation
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Context Indicators'
