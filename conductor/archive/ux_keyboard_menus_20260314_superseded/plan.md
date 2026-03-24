# Implementation Plan - Keyboard Shortcuts & Application Menus

## Phase 1: Electron Menu Bar

Implement native application menus.

- [ ] Task: Create menu template in main process
  - [ ] Write tests for menu structure
  - [ ] Define File, Edit, View, Navigate, Help menus
  - [ ] Add platform-specific accelerator keys
- [ ] Task: Wire menu items to IPC handlers
  - [ ] Write tests for menu IPC communication
  - [ ] Create IPC handlers for menu actions
  - [ ] Connect to existing functionality (refresh, navigate, etc.)
- [ ] Task: Add Recent Projects submenu
  - [ ] Write tests for recent projects list
  - [ ] Store and display recent project paths
  - [ ] Add clear recent projects option
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Electron Menu Bar'

## Phase 2: Global Keyboard Shortcuts

Implement navigation and action shortcuts.

- [ ] Task: Create keyboard shortcut handler hook
  - [ ] Write tests for shortcut detection
  - [ ] Create useKeyboardShortcut hook
  - [ ] Handle platform-specific modifiers
- [ ] Task: Implement navigation shortcuts
  - [ ] Write tests for tab navigation
  - [ ] Add Cmd+1/2/3/4 for tab switching
  - [ ] Add Cmd+[ for sidebar toggle
- [ ] Task: Implement action shortcuts
  - [ ] Write tests for action shortcuts
  - [ ] Add Cmd+R for refresh
  - [ ] Add Escape for panel close
  - [ ] Add Cmd+, for settings
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Global Keyboard Shortcuts'

## Phase 3: Task Keyboard Operations

Add shortcuts for task-specific operations.

- [ ] Task: Implement task selection via keyboard
  - [ ] Write tests for keyboard task selection
  - [ ] Add arrow key navigation in task lists
  - [ ] Add Enter to open task detail
- [ ] Task: Implement task status toggle via keyboard
  - [ ] Write tests for keyboard status toggle
  - [ ] Add Space to toggle selected task status
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Task Keyboard Operations'

## Phase 4: Shortcut Reference UI

Create keyboard shortcuts help.

- [ ] Task: Create KeyboardShortcutsDialog component
  - [ ] Write tests for dialog rendering
  - [ ] Display all shortcuts organized by category
  - [ ] Show platform-specific modifiers
- [ ] Task: Add Help menu item for shortcuts
  - [ ] Write tests for menu integration
  - [ ] Add "Keyboard Shortcuts" to Help menu
  - [ ] Wire to open KeyboardShortcutsDialog
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Shortcut Reference UI'

## Phase 5: Focus Management

Ensure proper keyboard accessibility.

- [ ] Task: Audit and fix tab navigation
  - [ ] Write tests for tab order
  - [ ] Ensure logical tab order throughout app
  - [ ] Add focus indicators
- [ ] Task: Implement focus trapping in modals
  - [ ] Write tests for focus trap
  - [ ] Trap focus in dialogs when open
  - [ ] Restore focus on close
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Focus Management'
