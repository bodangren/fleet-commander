---
name: Tactical Ledger
version: 2.0.0
colors:
  background: "#000000"
  foreground: "#FFFFFF"
  primary: "#FF4F00"
  primary-foreground: "#FFFFFF"
  secondary: "#00E5FF"
  secondary-foreground: "#000000"
  muted: "#1A1A1A"
  muted-foreground: "#A3A3A3"
  accent: "#262626"
  accent-foreground: "#FFFFFF"
  destructive: "#E11D48"
  destructive-foreground: "#FFFFFF"
  border: "#262626"
  active-border: "#404040"
  input: "#0A0A0A"
  ring: "#FF4F00"
typography:
  fontFamily: "Geist, Inter, system-ui, sans-serif"
  fontFamilyMono: "JetBrains Mono, ui-monospace, monospace"
  font-size-xs: 11px
  font-size-sm: 13px
  font-size-base: 15px
  font-size-lg: 18px
  font-size-xl: 22px
  font-size-2xl: 28px
  font-size-3xl: 36px
  line-height-none: 1
  line-height-tight: 1.1
  line-height-normal: 1.4
spacing:
  unit: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
rounded:
  none: 0px
  sm: 0px
  md: 0px
  lg: 0px
---

# Tactical Ledger: Kanban Conductor Identity

## Philosophical Foundation
The Tactical Ledger is a high-contrast, zero-fluff interface designed for mission-critical orchestration. It rejects the "soft" aesthetics of generic SaaS in favor of a rigid, high-density, and physically-grounded digital environment. Every pixel must serve a purpose; every border represents a hard constraint.

## Visual Pillars

### 1. Absolute Geometry
There are no rounded corners in the Tactical Ledger. Every container, button, and input is a perfect rectangle with 90-degree corners. This reflects the uncompromising nature of binary execution and state management.

### 2. High-Signal Chromatics
The palette is dominated by deep blacks and pure whites. Color is used exclusively as a signal:
- **International Orange (#FF4F00):** Used for primary execution paths and high-alert states.
- **Cyber Cyan (#00E5FF):** Used for active data streams, selected states, and successful completion.
- **Steel Gray (#1A1A1A):** Used for structural containment and muted background data.

### 3. Data Primacy
Data is never "stylized." It is presented in its rawest form using monospaced typography (`JetBrains Mono`) for all values, IDs, and timestamps. Labels use a sharp neo-grotesque (`Geist`) to maintain a professional, non-decorative tone.

### 4. Physical Borders
Separation is achieved through solid 1px and 2px borders rather than shadows or depth. This creates a "sheet-metal" feel where components are physically nested or stacked.

## Typography Scale

| Token | Size | Line Height | Application |
| :--- | :--- | :--- | :--- |
| `xs` | 11px | 1.0 | Micro-metadata, status indicators |
| `sm` | 13px | 1.1 | Secondary labels, data values |
| `base` | 15px | 1.4 | Primary body text |
| `lg` | 18px | 1.4 | Component headers |
| `xl` | 22px | 1.1 | Section headers |
| `2xl` | 28px | 1.1 | Page titles |
| `3xl` | 36px | 1.1 | Dashboard metrics |

## UI Implementation Rules

- **Buttons:** 2px solid border. Inverse colors on hover. No transitions.
- **Cards:** 1px solid `border`. Header section separated by a 1px `border-b`.
- **Inputs:** `background: black`, `border: 1px solid border`. `focus: border-primary`.
- **Kanban Columns:** Vertical dividers instead of guttered cards. Minimalist.
- **Status:** Use filled 6px squares instead of circles.

## Do's and Don'ts

### Do
- Use monospaced fonts for anything that changes (IDs, timers, counts).
- Maintain strict 0px border-radius on all elements.
- Use `primary` (Orange) sparingly to maintain its signal strength.
- Prefer uppercase for small labels (`font-size-xs`).

### Don't
- Use shadows, gradients, or blurs (glassmorphism is strictly forbidden).
- Use "modern" buzzwords in descriptions; the system is "tactical," "rigid," and "high-signal."
- Add padding to data tables; keep it dense.
- Use generic icons; prefer geometric glyphs.
