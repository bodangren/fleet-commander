# Specification - Keyboard Shortcuts & Application Menus

## Overview

This track adds comprehensive keyboard shortcuts and native Electron application menus with shortcut labels, enabling power users to navigate and operate the application efficiently.

## Functional Requirements

### 1. Application Menus (Electron)

- Implement native Electron menu bar with standard menus:
  - **File**: Open Project, Recent Projects, Refresh Board, Close Panel
  - **Edit**: Undo, Redo (future), Cut, Copy, Paste
  - **View**: Toggle Sidebar, Toggle Dark Mode, Reload, DevTools
  - **Navigate**: Go to Board, Go to Tracks, Go to Terminal, Go to Settings
  - **Help**: About, Keyboard Shortcuts Reference
- Display keyboard shortcuts in menu items (e.g., "Refresh Board ⌘R").
- Support platform-specific shortcuts (Cmd on macOS, Ctrl on Windows/Linux).

### 2. Global Keyboard Shortcuts

- **Navigation**:
  - `Cmd/Ctrl+1`: Go to Board
  - `Cmd/Ctrl+2`: Go to Tracks
  - `Cmd/Ctrl+3`: Go to Terminal
  - `Cmd/Ctrl+4`: Go to Settings
  - `Cmd/Ctrl+[`: Toggle Sidebar
  - `Escape`: Close detail panel / modal
- **Actions**:
  - `Cmd/Ctrl+R`: Refresh Board
  - `Cmd/Ctrl+Shift+R`: Hard Refresh (reload from disk)
  - `Cmd/Ctrl+K`: Command Palette (future enhancement)
  - `Cmd/Ctrl+,`: Open Settings
- **Task Operations** (when task selected):
  - `Enter`: Open task detail
  - `Space`: Toggle task status
  - `Delete/Backspace`: Archive task (with confirmation)

### 3. Shortcut Help

- Add "Keyboard Shortcuts" item in Help menu showing all shortcuts.
- Consider inline shortcut hints in tooltips.
- Add shortcut reference accessible via `?` or `Cmd/Ctrl+/`.

### 4. Focus Management

- Implement proper focus trapping in modals.
- Tab navigation through interactive elements.
- Arrow key navigation in task lists and menus.

## Non-Functional Requirements

- **Discoverability**: Shortcuts visible in menus.
- **Consistency**: Follow platform conventions (macOS vs Windows/Linux).
- **Accessibility**: All functionality accessible via keyboard.

## Acceptance Criteria

- [ ] Native Electron menu bar with all specified menus.
- [ ] Shortcuts displayed in menu items with platform-correct modifiers.
- [ ] Navigation shortcuts work from any view.
- [ ] Escape closes panels and modals.
- [ ] Keyboard shortcuts reference accessible from Help menu.
- [ ] Tab navigation works through all interactive elements.

## Out of Scope

- Command palette (Cmd+K) - future enhancement.
- Custom shortcut configuration.
