# Specification - Typography & Visual Hierarchy

## Overview

This track addresses the visual design issues identified in the UX audit: excessive use of small fonts, monochrome color palette, inconsistent spacing, and the "wireframe" aesthetic from dashed borders.

## Functional Requirements

### 1. Typography Scale

- Establish a clear type hierarchy with `text-sm` (14px) as the baseline body text.
- Reserve `text-xs` (12px) only for metadata, timestamps, and truly secondary information.
- Use `text-base` for primary content and headings.
- Ensure all interactive elements have readable labels (minimum 14px).

### 2. Color & Visual Hierarchy

- Introduce a primary accent color for key actions and status indicators.
- Use color to differentiate:
  - Task statuses (todo, in_progress, done)
  - Track/phase badges
  - Active vs inactive states
- Replace amber-500 warnings with a more cohesive color scheme.
- Add subtle background variations to create depth (not flat gray everywhere).

### 3. Border & Container Styling

- Replace `border-dashed` with solid borders for production-ready feel.
- Use subtle shadows for elevation hierarchy.
- Add rounded corners consistently (use Tailwind's `rounded-lg` as standard).

### 4. Spacing System

- Standardize on a spacing scale: `gap-2`, `gap-4`, `gap-6` for common use.
- Reduce random `space-y-3` / `space-y-4` variation.
- Ensure consistent padding in cards and panels.

## Non-Functional Requirements

- **Accessibility**: Maintain WCAG AA contrast ratios.
- **Performance**: No impact on render performance.

## Acceptance Criteria

- [ ] All body text uses `text-sm` or larger.
- [ ] Primary actions use accent color, not just gray.
- [ ] No `border-dashed` on production UI elements.
- [ ] Consistent spacing throughout the application.
- [ ] Status badges have distinct colors per status.
- [ ] Dark mode colors remain cohesive.

## Out of Scope

- Dark mode toggle UI (separate track).
- Component library changes (Shadcn Select, etc.).
