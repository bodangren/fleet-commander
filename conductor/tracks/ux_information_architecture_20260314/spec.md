# Specification - Information Architecture Refactor

## Overview

This track addresses the confusing overlap between Board and Tracks tabs, buried Settings, and lack of clear navigation structure. The goal is to create a more intuitive information hierarchy.

## Functional Requirements

### 1. Board/Tracks Consolidation

- Evaluate merging Board and Tracks into a single view with powerful filtering.
- Alternative: Make Board the primary view, Tracks becomes "Focus Mode" for single-track work.
- Ensure users understand the relationship between views.

### 2. Navigation Restructure

- Move Settings to a more discoverable location (gear icon in header or dedicated section).
- Add quick-access to common actions from the main view.
- Consider a command palette (Cmd+K) for power users.

### 3. Panel Layout Improvements

- Make sidebar width adjustable or responsive.
- Make PlanDetailPanel resizable or collapsible.
- Consider moving PlanDetailPanel to a modal or bottom sheet for smaller screens.

### 4. Header & Breadcrumbs

- Add breadcrumbs showing current context (Project > Track > Phase).
- Display current project path prominently.
- Add quick project switcher if multiple projects are supported.

## Non-Functional Requirements

- **Discoverability**: New users can find key features without tutorial.
- **Efficiency**: Power users can navigate quickly.

## Acceptance Criteria

- [ ] Single primary view for task management (Board or consolidated).
- [ ] Settings accessible within 2 clicks from anywhere.
- [ ] Sidebar and detail panels are resizable.
- [ ] Current project path visible in UI.
- [ ] Clear visual distinction between different contexts.

## Out of Scope

- Multi-project support (future enhancement).
- Command palette (separate track for keyboard shortcuts).
