# Implementation Plan: Visual Refresh: Ultraviolet Rave

## Phase 1: Define Visual Identity
- [x] Read the current `DESIGN.md` and project code to understand the domain.
- [x] Brainstorm and select a highly opinionated visual theme that fits the domain perfectly (Inspiration: The Verge / Rave Flyer).
- [x] Update `DESIGN.md` with specific color tokens, typography, and styling rules for the "Ultraviolet Rave" theme (Acid Mint, Ultraviolet, Story Tiles, kinetic typography).
- [x] Run `npx -y @google/design.md lint DESIGN.md` to ensure structural compliance.

## Phase 2: Refactor UI Foundation
- [x] Update `frontend/tailwind.config.js` with the new color palette, font families (Space Grotesk, JetBrains Mono), and border radius (8px lg).
- [x] Update `frontend/src/index.css` to define the new HSL variables for the "Ultraviolet Rave" theme and add `.story-tile` and `.btn-rave` utilities.

## Phase 3: Refactor UI Components
- [x] Refactor core UI components (Button, Card, Input) in `frontend/src/components/ui/` to enforce the "Ultraviolet Rave" rules (thick borders, hard offset shadows, bold uppercase typography).
- [x] Refactor main layout and pages (`AppLayout`, `DashboardPage`, `ProjectViewPage`).
- [x] Update Kanban board layout to use massive headers, story-tile cards, and neon accents.
- [x] Refactor dashboard stats and charts (`OverviewStats`, `ProjectCard`, `AgentUtilization`, `VelocityChart`, `IssueResolution`).
- [x] Verify the visual refresh locally (all components updated to neon high-energy aesthetic).
