# Design Redesign Plan — Fleet Commander

## Objective

Rethink the Fleet Commander visual identity by selecting three design models from the `getdesign.md` catalog and generating a side-by-side visual comparison stylesheet.

## Selected Designs

### 1. Linear

**Source:** https://getdesign.md/linear.app/design-md
**GitHub:** https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md
**Aesthetic:** Ultra-minimal, precise, purple accent. The gold standard for project management UI.
**Why it fits:** Linear is literally built for issue tracking and sprint boards — directly maps to Fleet Commander's kanban + sprint workflow. Its minimal precision reduces cognitive load when managing multiple AI employees across parallel tracks.

**Color Tokens (from DESIGN.md):**
- Canvas: `#010102` (deepest dark with faint blue tint)
- Surface-1: `#0f1011` (charcoal lift for cards)
- Surface-2: `#141516` (featured/hovered cards)
- Surface-3: `#18191a` (sub-nav, dropdowns)
- Surface-4: `#191a1b` (deepest lifted surface)
- Primary: `#5e6ad2` (Linear lavender-blue)
- Primary-hover: `#828fff`
- Primary-focus: `#5e69d1`
- Ink: `#f7f8f8` (headlines, body)
- Ink-muted: `#d0d6e0` (secondary)
- Ink-subtle: `#8a8f98` (tertiary)
- Ink-tertiary: `#62666d` (disabled)
- Hairline: `#23252a` (1px borders)
- Hairline-strong: `#34343a`
- Semantic-success: `#27a644`

**Typography (from DESIGN.md):**
- Display-xl: 80px / 600 / 1.05 / -3.0px (hero)
- Display-lg: 56px / 600 / 1.10 / -1.8px (section)
- Display-md: 40px / 600 / 1.15 / -1.0px (sub-section)
- Headline: 28px / 600 / 1.20 / -0.6px
- Card-title: 22px / 500 / 1.25 / -0.4px
- Body-lg: 18px / 400 / 1.50 / -0.1px
- Body: 16px / 400 / 1.50 / -0.05px
- Body-sm: 14px / 400 / 1.50 / 0
- Caption: 12px / 400 / 1.40 / 0
- Button: 14px / 500 / 1.20 / 0
- Eyebrow: 13px / 500 / 1.30 / +0.4px
- Font: `Inter, system-ui, sans-serif` (fallback for Linear Display)
- Mono: `JetBrains Mono, ui-monospace, monospace`

**Spacing (from DESIGN.md):**
- Base: 4px
- Scale: 4, 8, 12, 16, 24, 32, 48, 96 (section)

**Radius (from DESIGN.md):**
- xs: 4px, sm: 6px, md: 8px, lg: 12px, xl: 16px, xxl: 24px, pill: 9999px

**Elevation (from DESIGN.md):**
- Level 0: No shadow, no border
- Level 1: Surface-1 background + 1px hairline
- Level 2: Surface-2 background + 1px hairline-strong
- Level 3: Surface-3 background
- Level 4: 2px primary-focus outline at 50% opacity

**Key Rules:**
- Reserve primary lavender ONLY for: brand mark, primary CTA, focus ring, link emphasis
- No second chromatic accent on marketing
- No atmospheric gradients or spotlight cards
- Product UI screenshots dominate as decorative depth
- Cards use lg (12px) corners with 1px hairline borders

---

### 2. Supabase

**Source:** https://getdesign.md/supabase/design-md
**GitHub:** https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/supabase/DESIGN.md
**Aesthetic:** Clean white canvas with single emerald-green CTA, code-first, developer-native.
**Why it fits:** Leans into the "AI employees running CLI tools" narrative. The emerald-on-dark code blocks signal developer credibility and pair well with monospace terminal output from employee runs.

**Color Tokens (from DESIGN.md):**
- Canvas: `#ffffff` (white marketing surface)
- Canvas-soft: `#fafafa` (alternating sections)
- Canvas-night: `#1c1c1c` (code blocks, dark surfaces)
- Canvas-night-soft: `#202020` (nested dark chrome)
- Primary: `#3ecf8e` (Supabase emerald)
- Primary-deep: `#24b47e` (pressed state)
- Primary-soft: `#4ade80` (chart accents)
- Ink: `#171717` (near-black body)
- Ink-secondary: `#212121`
- Ink-mute: `#707070`
- Ink-mute-2: `#9a9a9a`
- Ink-faint: `#b2b2b2`
- On-primary: `#171717` (dark text on green — idiosyncratic choice)
- On-dark: `#ffffff`
- Hairline: `#dfdfdf`
- Hairline-strong: `#c7c7c7`
- Hairline-cool: `#ededed`

**Typography (from DESIGN.md):**
- Display-xxl: 64px / 500 / 1.1 / -1.92px (hero)
- Display-xl: 48px / 500 / 1.1 / -1.44px (section)
- Display-lg: 36px / 500 / 1.15 / -0.72px (sub-section)
- Display-md: 28px / 500 / 1.2 / -0.42px (card title)
- Heading-lg: 22px / 500 / 1.2 / 0
- Heading-md: 18px / 500 / 1.4 / 0
- Body-lg: 18px / 400 / 1.55 / 0
- Body-md: 16px / 400 / 1.5 / 0
- Button-md: 14px / 500 / 1.0 / 0
- Caption: 13px / 400 / 1.45 / 0
- Micro: 12px / 400 / 1.45 / 0
- Code: 14px / 400 / 1.5 / 0
- Font: `Inter, system-ui, sans-serif` (fallback for Circular)
- Mono: `ui-monospace, Menlo, Monaco, Consolas, monospace`

**Spacing (from DESIGN.md):**
- Base: 8px (with 2/4/12 sub-tokens)
- Scale: 2, 4, 8, 12, 16, 24, 32, 64

**Radius (from DESIGN.md):**
- xs: 4px, sm: 6px, md: 8px, lg: 12px, xl: 16px, full: 9999px

**Elevation (from DESIGN.md):**
- Level 0: Flat, 1px hairline
- Level 1: `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`
- Level 2: `box-shadow: 0 8px 24px rgba(0,0,0,0.08)`
- Level 3: `box-shadow: 0 16px 48px rgba(0,0,0,0.12)`

**Key Rules:**
- Single emerald primary as the only chromatic event
- White canvas marketing track — no atmospheric gradients
- Display tier at weight 500 with negative letter-spacing
- Square-ish 6px button radii — never pill-shaped
- Near-black text on green buttons (not white) — idiosyncratic brand choice
- Code blocks in deep canvas-night with monospace

---

### 3. PostHog

**Source:** https://getdesign.md/posthog/design-md
**GitHub:** https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/posthog/DESIGN.md
**Aesthetic:** Warm cream canvas, playful hedgehog branding, developer-friendly, anti-corporate.
**Why it fits:** Balances personality with information density — ideal for a dashboard showing employee metrics, sprint progress, and run logs. The playful tone matches the "virtual software house" concept without being juvenile.

**Color Tokens (from DESIGN.md):**
- Canvas: `#eeefe9` (warm cream — NOT white)
- Surface-soft: `#e5e7e0` (button-secondary, sub-nav)
- Surface-card: `#ffffff` (white cards on cream)
- Surface-doc: `#fcfcfa` (doc article body)
- Surface-dark: `#23251d` (code blocks, inverted)
- Primary: `#f7a501` (PostHog yellow-orange)
- Primary-pressed: `#dd9001`
- Primary-active: `#b17816`
- On-primary: `#23251d` (deep olive on yellow)
- Ink: `#23251d` (headlines, deep olive-charcoal)
- Body: `#4d4f46` (default paragraph, olive-gray)
- Charcoal: `#33342d` (emphasized body)
- Mute: `#6c6e63` (metadata, footer)
- Ash: `#9b9c92` (disabled)
- Stone: `#b6b7af` (least-emphasis)
- Hairline: `#bfc1b7` (olive borders)
- Hairline-soft: `#dcdfd2` (in-card dividers)
- On-dark: `#ffffff`
- Link-blue: `#1d4ed8`
- Link-teal: `#1078a3`
- Accent-blue-soft: `#dceaf6` (tip callout)
- Accent-green-soft: `#d9eddf` (success callout)
- Accent-red-soft: `#f7d6d3` (warning callout)
- Accent-purple-soft: `#e7d8ee` (info callout)

**Typography (from DESIGN.md):**
- Display-xl: 36px / 700 / 1.5 / 0 (hero)
- Display-lg: 24px / 800 / 1.33 / -0.6px (section)
- Heading-lg: 21px / 700 / 1.4 / -0.5px (sub-section)
- Heading-md: 20px / 700 / 1.4 / 0
- Heading-sm: 18px / 700 / 1.5 / 0 (uppercase eyebrow)
- Heading-sm-mixed: 18px / 600 / 1.56 / 0
- Body-md: 16px / 400 / 1.5 / 0
- Body-strong: 16px / 600 / 1.5 / 0
- Body-sm: 15px / 400 / 1.71 / 0
- Body-xs: 14px / 500 / 1.43 / 0
- Caption-md: 14px / 700 / 1.71 / 0
- Caption-sm: 13px / 500 / 1.5 / 0
- Caption-xs: 12px / 600 / 1.33 / 0 (uppercase)
- Utility-xs: 12px / 700 / 1.33 / 0 (uppercase)
- Button-md: 14px / 700 / 1.5 / 0
- Button-sm: 13px / 500 / 1 / 0
- Code-sm: 14px / 400 / 1.43 / 0
- Font: `IBM Plex Sans Variable, -apple-system, system-ui, sans-serif`
- Mono: `Source Code Pro, ui-monospace, monospace`

**Spacing (from DESIGN.md):**
- Base: 8px (with 2/4/6px sub-tokens)
- Scale: 2, 4, 8, 12, 16, 24, 32, 80 (section)

**Radius (from DESIGN.md):**
- none: 0px, xs: 2px, sm: 4px, md: 6px, lg: 8px, full: 9999px

**Elevation (from DESIGN.md):**
- Level 0: Flat, no border
- Level 1: 1px solid hairline
- Level 2: 1px solid hairline-soft
- Level 3: Inverted dark code block (color, not shadow)
- No drop shadows on cards — flat on cream with thin olive borders

**Key Rules:**
- Warm cream canvas (`#eeefe9`) end-to-end — never pure white
- Single yellow-orange CTA pill — the only saturated color
- IBM Plex Sans Variable across every text role (400/500/600/700/800)
- Hand-drawn hedgehog mascots as the entire decorative system
- 4–6px radius vocabulary — cards flat on cream with olive borders
- Pastel callout banners only inside doc content
- No drop shadows on cards

---

## Comparison Matrix

| Aspect | Linear | Supabase | PostHog |
|--------|--------|----------|---------|
| **Canvas** | `#010102` (near-black) | `#ffffff` (white) | `#eeefe9` (warm cream) |
| **Primary** | `#5e6ad2` (lavender) | `#3ecf8e` (emerald) | `#f7a501` (yellow-orange) |
| **Typography** | Inter (500-600) | Inter (400-500) | IBM Plex Sans (400-800) |
| **Display tracking** | -3.0px at 80px | -1.92px at 64px | 0px (no negative tracking) |
| **Button radius** | 8px (md) | 6px (sm) | 6px (md) |
| **Card radius** | 12px (lg) | 12px (lg) | 6px (md) |
| **Elevation** | Surface ladder + hairline | Box shadows | Flat + hairline borders |
| **Decorative** | Product screenshots | Product mockups | Hedgehog illustrations |
| **Tone** | Precision, luxury | Code-first, clean | Playful, anti-corporate |
| **Dark mode** | Default (only) | Code blocks only | Code blocks only |

---

## Deliverables

### 1. `measure/getdesign.md`

A curated document containing the three selected designs with full token definitions extracted from the GitHub repository. Structure:

```markdown
# Design Catalog — Fleet Commander

Selected from https://getdesign.md catalog.
Source files: https://github.com/VoltAgent/awesome-design-md/tree/main/design-md

## Design 1: Linear
[Full YAML token block + overview + do's/don'ts from DESIGN.md]

## Design 2: Supabase
[Full YAML token block + overview + do's/don'ts from DESIGN.md]

## Design 3: PostHog
[Full YAML token block + overview + do's/don'ts from DESIGN.md]

## Comparison Matrix
[Side-by-side summary table]
```

### 2. `measure/design-preview.html`

Generated from the template at `measure/assets/design-preview-template.html`. Each of the three tabs is populated with the corresponding design's actual tokens from their DESIGN.md files. Components rendered per tab:
- Navigation bar
- Hero section
- Color palette swatches (using actual hex values)
- Typography hierarchy (using actual sizes/weights/spacing)
- Button variants (primary, secondary, ghost)
- Product cards (using actual card tokens)
- Form inputs (using actual input tokens)
- Spacing scale (using actual spacing tokens)
- Border radius scale (using actual radius tokens)
- Elevation/depth examples (using actual shadow/border treatments)

### 3. `measure/index.md` update

Add link to `getdesign.md` in the Definition section:
```markdown
- [Design Catalog](./getdesign.md)
```

## Implementation Steps

1. **Create `measure/getdesign.md`** — Write the three design models with full token definitions extracted from the GitHub DESIGN.md files
2. **Create `measure/design-preview.html`** — Populate the template with the three designs' actual tokens
3. **Update `measure/index.md`** — Add link to the new catalog
4. **Verify** — Open `measure/design-preview.html` in browser, confirm all 3 tabs render correctly

## Verification

- [ ] `measure/design-preview.html` opens in browser with 3 working tabs
- [ ] Each tab shows distinct visual identity (different colors, typography, radius)
- [ ] All component sections render: nav, hero, palette, typography, buttons, cards, forms, spacing, radius, elevation
- [ ] `measure/getdesign.md` is well-structured with complete token definitions from actual DESIGN.md files
- [ ] `measure/index.md` links to the new catalog
