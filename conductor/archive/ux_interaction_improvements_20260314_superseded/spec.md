# Specification - Interaction Improvements

## Overview

This track addresses interaction problems: non-obvious drag affordances, confusing click behavior, lack of undo/confirmation, and inconsistent use of native selects vs Shadcn components.

## Functional Requirements

### 1. Drag & Drop Affordances

- Add visible drag handles to task cards.
- Show cursor change and subtle lift effect on hover.
- Consider alternative: dropdown menu for status change (more accessible).
- Make click-to-select and drag-to-move distinct interactions.

### 2. Confirmation & Undo

- Add confirmation dialogs for destructive actions (delete template, cancel schedule).
- Implement undo toast for non-destructive actions (status change, title edit).
- Use toast notifications for action feedback.

### 3. Native Select Replacement

- Replace all native `<select>` elements with Shadcn Select component.
- Ensure consistent styling across the application.
- Support keyboard navigation in all selects.

### 4. Inline Editing Improvements

- Make inline editing opt-in (click to edit) rather than always-on.
- Show edit icon or pencil indicator on hover.
- Add escape-to-cancel and enter-to-save behavior.
- Consider read-only mode by default with explicit edit toggle.

### 5. Schedule Controls UX

- Extract inline schedule controls to an expandable panel or modal.
- Group related controls (mode, time, unit) visually.
- Add clear visual separation between schedule config and schedule status.

## Non-Functional Requirements

- **Accessibility**: All interactions keyboard-accessible.
- **Performance**: Smooth animations, no jank.

## Acceptance Criteria

- [ ] Task cards have visible drag affordance.
- [ ] Destructive actions require confirmation.
- [ ] All selects use Shadcn Select component.
- [ ] Inline editing is opt-in with clear affordance.
- [ ] Schedule controls are grouped and not crammed inline.
- [ ] Toast notifications provide action feedback.

## Out of Scope

- Keyboard shortcuts (separate track).
- Drag-and-drop beyond status change.
