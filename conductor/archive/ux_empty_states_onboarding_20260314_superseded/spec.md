# Specification - Empty States & Onboarding

## Overview

This track addresses the lack of guidance for new users: empty states with no instructions, no onboarding flow, and unclear next steps when the app first loads.

## Functional Requirements

### 1. Empty State Improvements

- **Board (no project loaded)**:
  - Clear message: "Open a project to view your tracks"
  - Prominent "Open Project" button
  - Visual illustration or icon
- **Board (no tasks)**:
  - Message: "No tasks found in this project"
  - Link to conductor documentation
  - "Create your first track" guidance
- **Terminal (no project)**:
  - Current message is minimal; add guidance
  - Show steps to get started
- **Settings (no templates)**:
  - Current message exists; add example template
  - Link to documentation for template syntax

### 2. First Launch Onboarding

- Detect first launch (no previous project opened).
- Show welcome modal with:
  - Brief app description
  - "Open a project" as primary action
  - "Create example project" as secondary action (optional)
- Offer "Don't show again" option.

### 3. Contextual Help

- Add help tooltips for complex features (schedule config, agent assignment).
- Consider "?" icons that open inline explanations.
- Link to conductor methodology documentation.

### 4. Loading States

- Improve "Loading..." messages with skeleton screens.
- Add progress indicators for long operations.
- Show what's being loaded (e.g., "Loading tracks from disk...").

## Non-Functional Requirements

- **Clarity**: Users understand what to do next at all times.
- **Brevity**: Onboarding is quick and skippable.

## Acceptance Criteria

- [ ] All empty states have clear guidance and next action.
- [ ] First launch shows welcome modal with "Open Project" action.
- [ ] Loading states use skeleton screens or descriptive messages.
- [ ] Help tooltips available for complex features.
- [ ] Links to documentation where appropriate.

## Out of Scope

- Interactive tutorial/walkthrough.
- Example project creation.
- In-app documentation browser.
