---
name: Kanban Conductor Design System
version: 1.0.0
colors:
  background: "#0a0c10"
  foreground: "#f8fafc"
  primary: "#f8fafc"
  primary-foreground: "#111827"
  secondary: "#1e293b"
  secondary-foreground: "#f8fafc"
  muted: "#1e293b"
  muted-foreground: "#94a3b8"
  accent: "#1e293b"
  accent-foreground: "#f8fafc"
  destructive: "#7f1d1d"
  destructive-foreground: "#f8fafc"
  border: "#1e293b"
  input: "#1e293b"
  ring: "#d1d5db"
typography:
  fontFamily: "Inter, system-ui, sans-serif"
  font-size-xs: 12px
  font-size-sm: 14px
  font-size-base: 16px
  font-size-lg: 18px
  font-size-xl: 20px
  font-size-2xl: 24px
  font-size-3xl: 30px
  line-height-tight: 1.25
  line-height-normal: 1.5
  line-height-relaxed: 1.625
spacing:
  unit: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
rounded:
  lg: 8px
  md: 6px
  sm: 4px
---

# Kanban Conductor Design System

## Overview
Kanban Conductor is a high-performance orchestration dashboard. The design system emphasizes clarity, density, and low-latency feedback. It uses a dark-first aesthetic (Shadcn UI inspired) with high-contrast primary elements and subtle muted surfaces for secondary information.

## Colors
The system uses a variable-based color palette that supports both Light and Dark modes, with a strong preference for the Dark theme in developer-centric views.

### Core Palette (Dark Mode)
- **Background:** `#0a0c10` (HSL 224 71.4% 4.1%) - Deep charcoal for maximum focus.
- **Foreground:** `#f8fafc` (HSL 210 20% 98%) - Crisp white for readability.
- **Primary:** `#f8fafc` (HSL 210 20% 98%) - Used for high-emphasis actions.
- **Secondary:** `#1e293b` (HSL 215 27.9% 16.9%) - Used for subtle UI elements.
- **Destructive:** `#7f1d1d` (HSL 0 62.8% 30.6%) - Error and alert states.

### UI Accents
- **Border:** `#1e293b` (HSL 215 27.9% 16.9%) - Low contrast borders to reduce visual noise.
- **Muted Foreground:** `#94a3b8` (HSL 217.9 10.6% 64.9%) - Used for secondary text.

## Typography
The system relies on a clean sans-serif stack, primarily Inter, to ensure legibility of dense data.

| Token | Size | Line Height | Description |
| :--- | :--- | :--- | :--- |
| `xs` | 12px | 1.25 | Captions, status badges |
| `sm` | 14px | 1.25 | Secondary text, table data |
| `base` | 16px | 1.5 | Primary body text |
| `lg` | 18px | 1.5 | Small headers |
| `xl` | 20px | 1.5 | Section titles |
| `2xl` | 24px | 1.5 | Page headers |
| `3xl` | 30px | 1.5 | Hero text |

## Spacing & Layout
A 4px grid system is used for all layout and component spacing.

- **Internal Padding:** `sm` (8px) for tight components, `md` (16px) for cards.
- **External Margins:** `lg` (24px) or `xl` (32px) for page sections.
- **Alignment:** All data columns are left-aligned; status indicators are center-aligned.

## Shapes & Radius
Components use consistent rounding to soften the technical nature of the application.

- **Large (lg):** 8px - Main containers and cards.
- **Medium (md):** 6px - Buttons, inputs, and modals.
- **Small (sm):** 4px - Inner component elements (e.g., tags, tooltips).

## Components

### Base Elements
- **Cards:** Background `card`, 1px solid `border`, `rounded.lg`.
- **Buttons:** Background `primary`, Text `primary-foreground`, `rounded.md`.
- **Inputs:** Border `input`, Background transparent, `rounded.md`.

### Complex Components

#### Kanban Board
- **Columns:** Muted background (`secondary`), minimum width 300px.
- **Tasks:** Card components with `sm` padding and draggable states.
- **Headers:** `font-size-sm` with uppercase transformation and `muted-foreground`.

#### Agent & Project Cards
- **Status Indicators:** Small colored circles (`green-500` for active, `yellow-500` for idle, `red-500` for error).
- **Metadata:** Use `font-size-xs` and `muted-foreground` for timestamps and resource usage.
- **Actions:** Icon buttons in the top-right corner using `accent` on hover.

#### Pipeline Timeline
- **Nodes:** `rounded.sm` with status-based background colors.
- **Connectors:** 1px solid `muted` lines.
- **Hover States:** Increase border contrast to `foreground`.

## Do's and Don'ts

### Do
- Use `muted-foreground` for non-essential metadata.
- Maintain high contrast for primary actions.
- Use `rounded.lg` for all top-level dashboard cards.
- Prefer `sm` (8px) gaps in flex containers for tight alignment.

### Don't
- Use saturated colors for backgrounds; stick to the HSL scale.
- Overuse elevation; prefer borders for separation.
- Mix font families; stick to the defined sans-serif stack.
- Set font weights above 600 for body text; keep it clean.
