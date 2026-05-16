# Keyboard Shortcuts & Command Palette

## Overview

Full keyboard-driven workflow for Fleet Commander. Command palette for quick actions, keyboard navigation for kanban board, customizable bindings, and in-app shortcut reference.

## Functional Requirements

1. **Command Palette (Cmd+K)**
   - Global shortcut Cmd+K (Ctrl+K on Windows/Linux) opens overlay
   - Fuzzy search across: tasks, agents, actions, navigation items
   - Search results ranked by recency and match quality
   - Action dispatch: selecting a result triggers the associated action
   - Recent actions stored locally for quick re-access

2. **Kanban Keyboard Navigation**
   - Arrow keys: navigate between columns (left/right) and tasks (up/down)
   - Enter: select/expand task detail
   - Escape: deselect, close panels
   - Space: toggle task selection for multi-select
   - Shift+arrows: extend selection range
   - Tab/Shift+Tab: cycle focus between sidebar, board, detail panel

3. **Customizable Key Bindings**
   - Settings UI for viewing and editing all keyboard shortcuts
   - Conflict detection: warn when binding overlaps existing
   - Bindings persisted in user preferences (Convex or localStorage)
   - Reset to defaults option

4. **Shortcut Cheat Sheet**
   - Help modal (? shortcut) listing all available shortcuts
   - Grouped by context: global, kanban, detail panel, navigation
   - Searchable within cheat sheet

## Data Sources

- `userPreferences` (new or localStorage) — custom key bindings
- Application action registry — mappable actions

## Acceptance Criteria

- [ ] Cmd+K opens command palette with <100ms latency
- [ ] Fuzzy search returns relevant results within 50ms of keystroke
- [ ] Arrow key navigation moves focus correctly across kanban grid
- [ ] All shortcuts displayed in help modal
- [ ] Custom bindings persist across sessions
- [ ] No shortcut conflicts after user customization
- [ ] Keyboard-only workflow possible for all primary actions

## Out of Scope

- Vim-style modal editing
- Macro recording and playback
- Gesture-based shortcuts (trackpad)
- Screen reader keyboard announcements (accessibility track)
