# Implementation Plan: Visual Refresh: Tactical Ledger

## Phase 1: Define Visual Identity
- [x] Read the current `DESIGN.md` and project code to understand the domain.
- [x] Brainstorm and select a highly opinionated visual theme that fits the domain perfectly.
- [ ] Update `DESIGN.md` with specific color tokens, typography, and styling rules for the "Tactical Ledger" theme (black background, international orange/cyber cyan accents, 0px radius, monospaced data).
- [ ] Run `npx -y @google/design.md lint DESIGN.md` to ensure structural compliance.

## Phase 2: Refactor UI Foundation
- [ ] Update `frontend/tailwind.config.js` with the new color palette, font families (Geist, JetBrains Mono), and 0px border radius.
- [ ] Update `frontend/src/index.css` to define the new HSL variables for the "Tactical Ledger" theme.

## Phase 3: Refactor UI Components
- [ ] Refactor core UI components (Button, Card, Input) in `frontend/src/components/ui/` to enforce the "Tactical Ledger" rules (2px solid borders for buttons, 1px for cards, no shadows).
- [ ] Update Kanban board layout to use vertical dividers and high-density data presentation.
- [ ] Verify the visual refresh locally.
