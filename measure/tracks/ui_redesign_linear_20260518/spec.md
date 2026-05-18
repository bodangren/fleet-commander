# Track: UI Redesign — Linear Design System Compliance

## Overview

Replace the current cyberpunk/Tactical Ledger visual style with the Linear design system as defined in `measure/DESIGN.md` and `measure/ui-mockups.html`. The app currently uses neon purple/lime colors, thick borders, heavy shadows, and italic uppercase typography — all of which must be replaced with Linear's ultra-minimal, precise aesthetic.

## Functional Requirements

### 1. Design Token Compliance
- Canvas: `#010102` (never pure black)
- Primary: `#5e6ad2` (lavender-blue) with hover `#828fff`
- Surfaces: 4-step ladder (`surface-1` through `surface-4`)
- Typography: Inter font, weight 600 display / 400 body, aggressive negative tracking
- Radius: 8px buttons, 12px cards, 9999px pills
- Elevation: Surface ladder + hairline borders, no drop shadows on dark

### 2. Layout Structure
- Sidebar: 240px width, grouped sections with labels (Overview, Team, Work, Insights, Operations, History, System)
- Topbar: 56px height, minimal, with page title and actions
- Content: Clean padding, no heavy borders or shadows

### 3. Views to Match Mockups
- **Dashboard**: Sprint status, key metrics, agent status, attention needed, recent activity
- **Project Board**: Sprint selector, budget burndown, kanban columns (Backlog, Ready, In Progress, For Review, Merged)
- **Sprint Planning**: Project/budget selectors, PM agent recommendation, task selection table, agent cost breakdown
- **History**: Sprints, Agents, Tasks history pages
- **All other pages**: Updated to match Linear aesthetic

### 4. Component Updates
- Buttons: 8px radius, compact padding, primary/secondary/ghost variants
- Cards: 12px radius, 1px hairline border, surface-1 background
- Inputs: 8px radius, surface-1 background, lavender focus ring
- Badges: Pill shape, semantic colors with subtle backgrounds
- Tables: Hairline borders, hover states

## Acceptance Criteria

- [ ] All pages use Linear color palette (no neon purple/lime)
- [ ] All pages use Inter font (no italic serif)
- [ ] Layout matches mockup structure (sidebar groups, minimal topbar)
- [ ] Dashboard matches mockup content and layout
- [ ] Project Board has kanban with proper columns
- [ ] Sprint Planning page exists and matches mockup
- [ ] History section exists with Sprints/Agents/Tasks pages
- [ ] All existing tests pass
- [ ] No visual regressions in functionality

## Out of Scope
- Backend API changes
- New data models
- Drag-and-drop functionality (keep existing if present)
- Real-time updates beyond current implementation