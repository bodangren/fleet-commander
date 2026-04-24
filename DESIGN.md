---
name: Ultraviolet Rave
version: 1.0.0
colors:
  background: "#050505"
  foreground: "#F5F5F5"
  primary: "#BFFF00" # Acid Mint
  primary-foreground: "#000000"
  secondary: "#7B00FF" # Ultraviolet
  secondary-foreground: "#FFFFFF"
  muted: "#111111"
  muted-foreground: "#888888"
  accent: "#FF00FF" # Magenta
  accent-foreground: "#FFFFFF"
  destructive: "#FF0033"
  destructive-foreground: "#FFFFFF"
  border: "#1A1A1A"
  active-border: "#BFFF00"
  input: "#0A0A0A"
  ring: "#7B00FF"
typography:
  fontFamily: "Space Grotesk, Inter, system-ui, sans-serif"
  fontFamilyMono: "JetBrains Mono, ui-monospace, monospace"
  font-size-xs: 12px
  font-size-sm: 14px
  font-size-base: 16px
  font-size-lg: 20px
  font-size-xl: 28px
  font-size-2xl: 40px
  font-size-3xl: 64px
  line-height-none: 0.9
  line-height-tight: 1.0
  line-height-normal: 1.2
spacing:
  unit: 8px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
rounded:
  none: 0px
  sm: 2px
  md: 4px
  lg: 8px
---

# Ultraviolet Rave: The High-Energy Identity

## Philosophical Foundation
Ultraviolet Rave is a high-octane visual system inspired by the digital maximalism of The Verge and the raw energy of underground rave flyers. It rejects "safe" UI patterns in favor of aggressive contrast, kinetic typography, and a "tiles-everywhere" philosophy. This is not a tool for passive observation; it is a cockpit for active orchestration.

## Visual Pillars

### 1. The Acid-Ultraviolet Axis
The palette is built on the violent tension between **Acid Mint (#BFFF00)** and **Ultraviolet (#7B00FF)**. These colors are never "muted." They are used to slash through the deep-black background, creating a high-contrast environment where information pops with neon intensity.

### 2. Rave-Flyer Story Tiles
Information is contained within "Story Tiles"—cards with thick, 4px-8px asymmetric borders. These tiles often use overlapping elements, offset shadows (without blur), and sharp internal grids. They are designed to feel like physical artifacts pasted onto a digital wall.

### 3. Kinetic Typography
Text is a design element, not just a carrier of information. Headers are oversized (`3xl` at 64px), often using `Space Grotesk` with tight tracking and leading. When in doubt, make it bigger and bolder. Use italics to imply speed and urgency.

### 4. Non-Linear Grids
While the underlying structure is a grid, the visual implementation should feel asymmetric. Use varied tile sizes and unexpected alignment to keep the user's eye moving. This mimics the "controlled chaos" of a high-energy news feed.

## Typography Scale

| Token | Size | Line Height | Application |
| :--- | :--- | :--- | :--- |
| `xs` | 12px | 1.0 | Micro-metadata, tag labels |
| `sm` | 14px | 1.0 | Secondary data, small buttons |
| `base` | 16px | 1.2 | Body text, input values |
| `lg` | 20px | 1.0 | Tile sub-headers |
| `xl` | 28px | 0.9 | Tile titles, section headers |
| `2xl` | 40px | 0.9 | Page headers, hero stats |
| `3xl` | 64px | 0.9 | Massive display headlines |

## UI Implementation Rules

- **Buttons:** 4px solid border in Acid Mint or Ultraviolet. No rounded corners. 4px offset "hard" shadow.
- **Story Tiles:** 1px solid `border` base, but with a 6px `border-l` or `border-t` in a primary/secondary color.
- **Inputs:** Dark background with a 2px Ultraviolet focus ring.
- **Kanban Board:** Massive headers for columns. Cards should look like mini rave flyers with bold status indicators.
- **Animations:** Snap-to-state transitions. No "soft" eases. Fast, 150ms durations.

## Do's and Don'ts

### Do
- Use Acid Mint for "Action" and Ultraviolet for "Structure."
- Overlap text on borders for a "poster" feel.
- Use 8px hard shadows for containers to create depth without blur.
- Embrace the "LOUD" aesthetic.

### Don't
- Use any gray between #222 and #DDD.
- Use border-radius greater than 4px.
- Use "clean" or "minimalist" as a guiding principle.
- Use standard opacity for overlays; use hard-edged patterns or solid blocks.
