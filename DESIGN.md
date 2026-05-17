---
name: Linear
version: 1.0.0
colors:
  canvas: "#010102"
  surface-1: "#0f1011"
  surface-2: "#141516"
  surface-3: "#18191a"
  surface-4: "#191a1b"
  primary: "#5e6ad2"
  primary-hover: "#828fff"
  primary-focus: "#5e69d1"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"
  hairline: "#23252a"
  hairline-strong: "#34343a"
  hairline-tertiary: "#3e3e44"
  inverse-canvas: "#ffffff"
  inverse-ink: "#000000"
  semantic-success: "#27a644"
  destructive: "#eb3d54"
  destructive-foreground: "#ffffff"
typography:
  display-xl:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 80px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -3.0px
  display-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.10
    letterSpacing: -1.8px
  display-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -1.0px
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: -0.6px
  card-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.4px
  body-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: -0.1px
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: -0.05px
  body-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: 0
  button:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: 0
  eyebrow:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.30
    letterSpacing: 0.4px
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  pill: 9999px
  full: 9999px
---

# Linear: The Precision Identity

## Philosophical Foundation
Linear's design system is built on ultra-minimal precision. The canvas is the deepest dark in any tool collection — `#010102`, essentially pure black with a faint blue tint. On top sits a four-step surface ladder for cards, panels, and lifted tiles, with hairline borders carrying hierarchy. The single chromatic accent is **Linear lavender-blue** (`#5e6ad2`), used sparingly on brand mark, focus rings, and primary CTAs. This is not a system that shouts; it whispers with authority.

## Visual Pillars

### 1. The Deepest Dark Canvas
The palette is anchored by `#010102` — near-pure black with a faint blue tint that distinguishes it from generic dark themes. This canvas is never replaced with true `#000000`. Four surface steps (`surface-1` through `surface-4`) create hierarchy through lift, not shadow.

### 2. Lavender-Blue Discipline
The single chromatic accent `#5e6ad2` appears only on: brand mark, primary CTA, focus ring, and link emphasis. A lighter hover state (`#828fff`) and focus-tinted variant (`#5e69d1`) extend the same hue. No second chromatic accent exists on the marketing surface.

### 3. Aggressive Negative Tracking
Display type runs at weight 600 with letter-spacing scaling from `-3.0px` at 80px down to `0` at body. This aggressive tightening pulls letterforms into editorial density, creating the system's signature "quiet luxury" feel.

### 4. Surface Ladder Elevation
Depth is carried by the four-step surface ladder + hairline borders. The brand resists drop shadows on dark almost entirely. Cards sit on `surface-1` with 1px `hairline` borders; featured cards lift to `surface-2` with `hairline-strong`.

## Typography Scale

| Token | Size | Weight | Line Height | Letter Spacing | Use |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display-xl` | 80px | 600 | 1.05 | -3.0px | Largest hero headline |
| `display-lg` | 56px | 600 | 1.10 | -1.8px | Section opener headlines |
| `display-md` | 40px | 600 | 1.15 | -1.0px | Sub-section headlines |
| `headline` | 28px | 600 | 1.20 | -0.6px | Pricing tier titles, CTA banner |
| `card-title` | 22px | 500 | 1.25 | -0.4px | Feature card title |
| `body-lg` | 18px | 400 | 1.50 | -0.1px | Hero subhead, lead paragraphs |
| `body` | 16px | 400 | 1.50 | -0.05px | Default body |
| `body-sm` | 14px | 400 | 1.50 | 0 | Card body, footer columns |
| `caption` | 12px | 400 | 1.40 | 0 | Captions, meta, status |
| `button` | 14px | 500 | 1.20 | 0 | All button labels |
| `eyebrow` | 13px | 500 | 1.30 | +0.4px | Section eyebrow (positive tracking) |
| `mono` | 13px | 400 | 1.50 | 0 | Code snippets, status tokens |

## UI Implementation Rules

- **Buttons:** 8px radius (`rounded-md`). Primary uses `primary` background with white text. Secondary uses `surface-1` background with `ink` text and 1px `hairline` border. Compact padding: 8px vertical, 14px horizontal.
- **Cards:** 12px radius (`rounded-lg`). Background `surface-1`, 1px `hairline` border. No drop shadows. Featured cards lift to `surface-2` with `hairline-strong` border.
- **Inputs:** 8px radius (`rounded-md`). Background `surface-1`, 1px `hairline-strong` border. Focus ring: 2px `primary-focus` outline at 50% opacity.
- **Kanban Board:** Column headers use `display-md` (40px). Cards use `card-title` (22px). Status badges use `caption` (12px) in pill shape.
- **Animations:** 150ms ease transitions. No spring physics. Snap-to-state.
- **Pills & Badges:** 9999px radius (`rounded-pill`). Background `surface-2`, text `ink-muted`, caption type.

## Do's and Don'ts

### Do
- Reserve `primary` lavender ONLY for: brand mark, primary CTA, focus ring, link emphasis.
- Use the four-step surface ladder for hierarchy. Never skip levels.
- Pair display weight 600 with body weight 400 — resist 700+ display weights.
- Apply negative letter-spacing aggressively on display sizes.
- Use `#010102` as the canvas — the faint blue tint is intentional.
- Compose CTAs with `rounded-md` 8px corners.

### Don't
- Don't use `#000000` true black as the canvas.
- Don't introduce a second chromatic accent (orange, pink, green).
- Don't add atmospheric gradients or spotlight cards.
- Don't pill-round CTAs — buttons use 8px radius.
- Don't use lavender as a section background or card fill.
- Don't add drop shadows on dark surfaces.
