# Keyboard Shortcuts & Command Palette — Implementation Plan

## Phase 1: Command Palette

- [ ] Install and configure fuzzy search library (fuse.js or equivalent)
- [ ] Build `CommandPalette` overlay component with search input and results list
- [ ] Register application actions: navigation, task operations, agent controls
- [ ] Implement global Cmd+K / Ctrl+K keyboard listener
- [ ] Wire search to action registry with fuzzy matching
- [ ] Add recent actions storage (localStorage) and display
- [ ] Action dispatch: navigate, open task, trigger mutation on selection
- [ ] Write unit tests for search ranking and action dispatch
- [ ] Performance: ensure <100ms open, <50ms per keystroke response

## Phase 2: Kanban Keyboard Navigation

- [ ] Implement focus management system for kanban grid (column × row)
- [ ] Arrow key handlers: left/right for columns, up/down for tasks within column
- [ ] Visual focus indicator (ring/border on focused task card)
- [ ] Enter key: expand task detail panel
- - [ ] Escape: close panels, deselect
- [ ] Space: toggle multi-select mode
- [ ] Shift+arrows: extend selection range
- [ ] Tab/Shift+Tab: cycle focus regions (sidebar, board, detail)
- [ ] Write tests for focus movement and selection state

## Phase 3: Custom Bindings and Cheat Sheet

- [ ] Define key binding schema: action ID → key combination
- [ ] Build `ShortcutSettings` UI: list all bindings with editable key inputs
- [ ] Conflict detection: highlight duplicate bindings, prevent save
- [ ] Persist custom bindings to userPreferences (Convex or localStorage)
- [ ] Reset-to-defaults button with confirmation
- [ ] Build `ShortcutCheatSheet` modal component (triggered by ?)
- [ ] Group shortcuts by context, add search within cheat sheet
- [ ] Integration tests: customize binding, verify it works, verify cheat sheet updates
