# Specification: Design Catalog Selection

## Overview

Select three design models from the getdesign.md catalog that best fit Fleet Commander's product definition, then create a visual comparison stylesheet for informed decision-making.

## Background

Fleet Commander is a virtual software house — a kanban board for managing AI employees on client projects. The current "Ultraviolet Rave" design (derived from The Verge's catalog entry) uses acid-mint + ultraviolet with sharp corners, hard shadows, and kinetic typography. The user wants to explore alternatives.

## Requirements

### R1: Design Selection
- Fetch the getdesign.md catalog (https://getdesign.md)
- Select three designs that fit the product definition
- Each design must be meaningfully different from the others
- Selections must be justified against the product context

### R2: Design Catalog Document
- Create `measure/getdesign.md` with the three selected designs
- Each design includes: source link, aesthetic summary, color tokens, typography, spacing, radius, component rules, and fit rationale
- Include a comparison matrix summarizing key differences

### R3: Visual Comparison Stylesheet
- Create `measure/design-preview.html` from the template at `measure/assets/design-preview-template.html`
- Each tab renders identical components styled with that design's tokens
- Components: nav, hero, palette, typography, buttons, cards, forms, spacing, radius, elevation

### R4: Index Update
- Add link to `getdesign.md` in `measure/index.md`

## Acceptance Criteria

- [ ] `measure/getdesign.md` exists with three complete design definitions
- [ ] `measure/design-preview.html` opens in browser with 3 working tabs
- [ ] Each tab shows a distinct visual identity
- [ ] All component sections render correctly in each tab
- [ ] `measure/index.md` links to the new catalog
