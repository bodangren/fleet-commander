# Design Catalog — Fleet Commander

Selected from https://getdesign.md catalog.
Source files: https://github.com/VoltAgent/awesome-design-md/tree/main/design-md

---

## Design 1: Linear

**Source:** https://getdesign.md/linear.app/design-md
**Aesthetic:** Ultra-minimal, precise, purple accent. The gold standard for project management UI.
**Why it fits:** Linear is literally built for issue tracking and sprint boards — directly maps to Fleet Commander's kanban + sprint workflow. Its minimal precision reduces cognitive load when managing multiple AI employees across parallel tracks.

### Colors

```yaml
colors:
  primary: "#5e6ad2"
  on-primary: "#ffffff"
  primary-hover: "#828fff"
  primary-focus: "#5e69d1"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"
  canvas: "#010102"
  surface-1: "#0f1011"
  surface-2: "#141516"
  surface-3: "#18191a"
  surface-4: "#191a1b"
  hairline: "#23252a"
  hairline-strong: "#34343a"
  hairline-tertiary: "#3e3e44"
  inverse-canvas: "#ffffff"
  inverse-surface-1: "#f5f6f6"
  inverse-ink: "#000000"
  brand-secure: "#7a7fad"
  semantic-success: "#27a644"
  semantic-overlay: "#000000"
```

### Typography

```yaml
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
```

### Spacing

```yaml
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px
```

### Radius

```yaml
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  pill: 9999px
  full: 9999px
```

### Elevation

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | No shadow, no border | Default body type, hero text |
| 1 (charcoal lift) | Surface-1 background + 1px hairline | Default cards, product panels |
| 2 (surface-2 lift) | Surface-2 background + 1px hairline-strong | Featured cards, hovered cards |
| 3 (surface-3 lift) | Surface-3 background | Sub-nav, dropdowns |
| 4 (focus ring) | 2px primary-focus outline at 50% opacity | Focused inputs, buttons |

### Key Rules

- Reserve primary lavender ONLY for: brand mark, primary CTA, focus ring, link emphasis
- No second chromatic accent on marketing
- No atmospheric gradients or spotlight cards
- Product UI screenshots dominate as decorative depth
- Cards use lg (12px) corners with 1px hairline borders
- Aggressive negative tracking on display (-3.0px at 80px)

---

## Design 2: Supabase

**Source:** https://getdesign.md/supabase/design-md
**Aesthetic:** Clean white canvas with single emerald-green CTA, code-first, developer-native.
**Why it fits:** Leans into the "AI employees running CLI tools" narrative. The emerald-on-dark code blocks signal developer credibility and pair well with monospace terminal output from employee runs.

### Colors

```yaml
colors:
  primary: "#3ecf8e"
  primary-deep: "#24b47e"
  primary-soft: "#4ade80"
  ink: "#171717"
  ink-secondary: "#212121"
  ink-mute: "#707070"
  ink-mute-2: "#9a9a9a"
  ink-faint: "#b2b2b2"
  on-primary: "#171717"
  on-dark: "#ffffff"
  canvas: "#ffffff"
  canvas-soft: "#fafafa"
  canvas-night: "#1c1c1c"
  canvas-night-soft: "#202020"
  hairline: "#dfdfdf"
  hairline-strong: "#c7c7c7"
  hairline-cool: "#ededed"
  accent-purple: "#6b01c2"
  accent-violet: "#644fc1"
  accent-yellow: "#ffdb13"
  accent-tomato: "#ff2201"
  accent-pink: "#c7007e"
  accent-indigo: "#054cff"
  accent-crimson: "#e2005a"
```

### Typography

```yaml
typography:
  display-xxl:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 64px
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -1.92px
  display-xl:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -1.44px
  display-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 36px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.72px
  display-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.42px
  heading-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
  heading-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  button-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  micro:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  code:
    fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
```

### Spacing

```yaml
spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  huge: 64px
```

### Radius

```yaml
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
```

### Elevation

| Level | Treatment | Use |
|---|---|---|
| 0 | Flat, 1px hairline | Default cards |
| 1 | `box-shadow: 0 1px 3px rgba(0,0,0,0.06)` | Subtle card lift |
| 2 | `box-shadow: 0 8px 24px rgba(0,0,0,0.08)` | Floating composited UI mockups |
| 3 | `box-shadow: 0 16px 48px rgba(0,0,0,0.12)` | Modal overlays |

### Key Rules

- Single emerald primary as the only chromatic event
- White canvas marketing track — no atmospheric gradients
- Display tier at weight 500 with negative letter-spacing
- Square-ish 6px button radii — never pill-shaped
- Near-black text on green buttons (not white) — idiosyncratic brand choice
- Code blocks in deep canvas-night with monospace

---

## Design 3: PostHog

**Source:** https://getdesign.md/posthog/design-md
**Aesthetic:** Warm cream canvas, playful hedgehog branding, developer-friendly, anti-corporate.
**Why it fits:** Balances personality with information density — ideal for a dashboard showing employee metrics, sprint progress, and run logs. The playful tone matches the "virtual software house" concept without being juvenile.

### Colors

```yaml
colors:
  primary: "#f7a501"
  primary-pressed: "#dd9001"
  primary-active: "#b17816"
  on-primary: "#23251d"
  ink: "#23251d"
  body: "#4d4f46"
  charcoal: "#33342d"
  mute: "#6c6e63"
  ash: "#9b9c92"
  stone: "#b6b7af"
  hairline: "#bfc1b7"
  hairline-soft: "#dcdfd2"
  on-dark: "#ffffff"
  canvas: "#eeefe9"
  surface-soft: "#e5e7e0"
  surface-card: "#ffffff"
  surface-doc: "#fcfcfa"
  surface-dark: "#23251d"
  link-blue: "#1d4ed8"
  link-teal: "#1078a3"
  accent-blue: "#2c84e0"
  accent-blue-soft: "#dceaf6"
  accent-red: "#cd4239"
  accent-red-soft: "#f7d6d3"
  accent-green: "#2c8c66"
  accent-green-soft: "#d9eddf"
  accent-purple: "#7c44a6"
  accent-purple-soft: "#e7d8ee"
  focus-ring: "rgba(59,130,246,0.5)"
```

### Typography

```yaml
typography:
  display-xl:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 0
  display-lg:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 800
    lineHeight: 1.33
    letterSpacing: -0.6px
  heading-lg:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 21px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: -0.5px
  heading-md:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0
  heading-sm:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 0
    textTransform: uppercase
  heading-sm-mixed:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.56
    letterSpacing: 0
  body-md:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-strong:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.71
    letterSpacing: 0
  body-xs:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: 0
  caption-md:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.71
    letterSpacing: 0
  caption-sm:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  caption-xs:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0
    textTransform: uppercase
  utility-xs:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: 0
    textTransform: uppercase
  button-md:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 0
  button-sm:
    fontFamily: "IBM Plex Sans Variable, -apple-system, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
  code-sm:
    fontFamily: "Source Code Pro, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0
```

### Spacing

```yaml
spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 80px
```

### Radius

```yaml
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
```

### Elevation

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No border, no shadow | Canvas-on-canvas blocks, hero text |
| 1 — Hairline border | 1px solid hairline | Marketing cards, pricing cards |
| 2 — Hairline soft | 1px solid hairline-soft | In-card row dividers |
| 3 — Inverted dark | Surface-dark fill | Code blocks inside doc cards |

No drop shadows on cards — flat on cream with thin olive borders.

### Key Rules

- Warm cream canvas (`#eeefe9`) end-to-end — never pure white
- Single yellow-orange CTA pill — the only saturated color
- IBM Plex Sans Variable across every text role (400/500/600/700/800)
- 4–6px radius vocabulary — cards flat on cream with olive borders
- Pastel callout banners only inside doc content
- No drop shadows on cards
- Hierarchy built from weight contrast more than size

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
