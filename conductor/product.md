# Initial Concept

**Conductor Command Center**

A local-first web application that visualizes the `conductor/` directory as a Kanban board and acts as a Command Center for multi-agent development.

**Core Workflow Mapping**

- **The Board:** Represents the `conductor/tracks.md` (Tracks Registry).
- **The Columns:** Statuses derived from the tracks (e.g., `New`, `In Progress`, `Done`, `Archived`).
- **The Cards:** Individual Tracks (e.g., `conductor/tracks/<track_id>`).
- **Card Details:** Clicking a card opens a view to edit `spec.md`, `plan.md` (with interactive checkboxes), and `metadata.json`.

**Enhanced Workflow & Features**

- **Bi-directional Sync:** Moving/editing cards updates the Markdown files and vice-versa.
- **Quick Actions:** Scaffolds new tracks (`spec.md`, `plan.md`) automatically.
- **Progress Tracking:** Visual progress bars on cards.
- **Agent Assignment:** Assign tasks to specific agents in `plan.md` using tags (e.g., `@gemini`, `@claude`).
- **One-Click Execution:** "Run" button next to tasks launches the assigned CLI agent.
- **Integrated Terminal:** Built-in terminal (xterm.js + node-pty) to interact with CLI agents directly within the app.
- **Configuration:** `conductor-config.json` maps tags to system commands.

**Tech Stack**

- **Frontend:** React (Vite) + Tailwind CSS + @hello-pangea/dnd.
- **Backend:** Node.js (Express) with `node-pty` for terminal sessions and file system operations.

# Product Definition - Conductor Command Center

## Vision & Goals

The Conductor Command Center is designed to be the definitive GUI for agentic LLM development using the Conductor methodology. It transforms the static Markdown-based workflow into an active, visual command center.

- **Visual Management:** Provide a high-density, draggable Kanban board that mirrors the `conductor/tracks.md` registry.
- **Agent Orchestration:** Enable seamless execution of multi-agent workflows by bridging the UI directly to local CLI tools.
- **Human-AI Collaboration:** Facilitate a real-time workspace where human developers can supervise and interact with AI agents as they execute complex plans.

## Target Audience

- **Power Users:** Developers and automation enthusiasts who utilize multiple CLI agents (Gemini, Claude, etc.) and require a centralized interface to manage their concurrent tasks and contexts.

## Core Features (MVP)

- **Kanban Board:** A bi-directional synced board where moving cards updates track statuses in real-time.
- **Interactive Plan Editor:** A side-panel view for `plan.md` that allows checking off tasks and sub-tasks, with changes reflected immediately in the source file.
- **Agent Mapping Configuration:** A dedicated settings interface to map custom agent tags (e.g., `@gemini`) to specific local terminal commands.
- **Context-Aware Terminal:** The ability to launch terminal sessions that are pre-loaded with the specific context and prompts defined within a track's task.

## Visual Design & UX

- **Modern Developer Aesthetic:** A clean, minimalist dark-mode interface prioritizing information density and efficiency.
- **Typography:** Extensive use of monospace fonts to maintain the "developer tool" feel.
- **Interactions:** Fast, responsive drag-and-drop and keyboard-friendly navigation.

---

# UX Migration Initiative (2026-03-14)

Following a comprehensive UX audit, the following improvements are planned:

## Typography & Visual Hierarchy

- Use `text-sm` (14px) as baseline; reserve `text-xs` for metadata only.
- Introduce accent colors for actions and status indicators.
- Replace dashed borders with solid borders and subtle shadows.
- Standardize spacing with consistent gap values.

## Information Architecture

- Consolidate Board/Tracks views or clarify their relationship.
- Make Settings more discoverable (header icon or prominent placement).
- Add resizable sidebar and detail panels.
- Add breadcrumb navigation for context.

## Interaction Improvements

- Add visible drag handles to task cards.
- Add confirmation dialogs for destructive actions.
- Replace native `<select>` with Shadcn Select components.
- Make inline editing opt-in with clear affordances.
- Extract schedule controls from inline task rows.

## Keyboard Shortcuts & Menus

- Native Electron menu bar with File, Edit, View, Navigate, Help.
- Global shortcuts for navigation (Cmd+1/2/3/4) and actions (Cmd+R, Escape).
- Keyboard shortcuts reference accessible from Help menu.
- Proper focus management and tab navigation.

## Empty States & Onboarding

- All empty states have clear guidance and next action.
- First-launch welcome modal with "Open Project" action.
- Skeleton loaders for loading states.
- Contextual help tooltips for complex features.
