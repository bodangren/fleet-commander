# Implementation Plan - Interaction Improvements

## Phase 1: Native Select Replacement

Replace native selects with Shadcn Select for consistency.

- [ ] Task: Audit all native `<select>` usage
  - [ ] Document all locations using native selects
  - [ ] Prioritize by visibility and interaction frequency
- [ ] Task: Replace BoardPanel filter selects
  - [ ] Write tests for Shadcn Select integration
  - [ ] Update track and phase filters to use Shadcn Select
- [ ] Task: Replace PlanDetailPanel selects
  - [ ] Write tests for agent and schedule selects
  - [ ] Update all dropdowns in task rows
- [ ] Task: Replace AgentTemplatesPanel selects (if any)
  - [ ] Write tests for any remaining selects
  - [ ] Update to Shadcn Select
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Native Select Replacement'

## Phase 2: Drag Affordances

Make drag-and-drop more discoverable.

- [ ] Task: Add drag handle icon to task cards
  - [ ] Write tests for drag handle visibility
  - [ ] Add GripVertical icon from lucide-react
  - [ ] Show handle on hover or always visible
- [ ] Task: Add hover effects for draggable state
  - [ ] Write tests for hover styling
  - [ ] Add subtle shadow/lift on hover
  - [ ] Change cursor to grab/grabbing appropriately
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Drag Affordances'

## Phase 3: Confirmation Dialogs

Add confirmation for destructive actions.

- [ ] Task: Create AlertDialog component (Shadcn)
  - [ ] Write tests for AlertDialog
  - [ ] Add to UI component library
- [ ] Task: Add confirmation to template deletion
  - [ ] Write tests for confirmation flow
  - [ ] Replace window.confirm with AlertDialog
- [ ] Task: Add confirmation to schedule cancellation
  - [ ] Write tests for confirmation flow
  - [ ] Add AlertDialog before cancel
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Confirmation Dialogs'

## Phase 4: Inline Editing Improvements

Make inline editing opt-in and clear.

- [ ] Task: Add edit mode toggle to PlanDetailPanel
  - [ ] Write tests for edit mode
  - [ ] Add "Edit" button to panel header
  - [ ] Disable inline inputs when not editing
- [ ] Task: Add edit affordance to inline fields
  - [ ] Write tests for edit affordance
  - [ ] Show pencil icon on hover
  - [ ] Add escape-to-cancel and enter-to-save
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Inline Editing Improvements'

## Phase 5: Schedule Controls Refactor

Extract inline schedule controls to dedicated area.

- [ ] Task: Create ScheduleConfigPanel component
  - [ ] Write tests for new component
  - [ ] Extract mode, time, unit controls to separate panel
  - [ ] Add expand/collapse functionality
- [ ] Task: Integrate ScheduleConfigPanel into PlanDetailPanel
  - [ ] Write tests for integration
  - [ ] Replace inline controls with expandable panel
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Schedule Controls Refactor'
