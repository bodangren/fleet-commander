# UI Cleanup + File Menu Project Access + Terminal Pane

## Overview
Clean up the UI by removing unused status/log widgets and success copy, move project loading into the File menu with a recent projects list, and wire up the Terminal tab to provide multiple embedded terminal sessions plus a dedicated app log stream.

## Functional Requirements
1. Remove the “Walking Skeleton successfully initialized.” text from the main header area.
2. Remove the System Status card, Database Logs card, and IPC Test UI.
3. Remove any data fetching or polling associated with system status and database logs.
4. Move project loading into the File menu:
   - Add “Open Project…” (system dialog).
   - Add “Open Recent” with the 5 most recently opened project paths.
   - Selecting a recent project loads it without opening the file dialog.
5. Remove the Project Loader panel from the Board tab.
6. Keep existing Board controls (filters, refresh) and behavior intact.
7. Wire up the Terminal tab:
   - Provide an embedded terminal view that runs commands in the selected project folder.
   - Support multiple terminal tabs/sessions.
   - Add a separate “Logs” tab that streams app logs (main + renderer) for diagnostics.

## Non-Functional Requirements
- Maintain current project persistence behavior and expand it to support a recent-projects list.
- UI remains responsive when log streaming and terminal sessions are active.
- No breaking changes to Conductor file parsing or project loading.

## Acceptance Criteria
- No System Status / Database Logs / IPC Test UI is visible in the app.
- The Board tab no longer shows the Project Loader panel.
- File menu offers Open Project… and Open Recent (5 items), and selecting either loads the project.
- Terminal tab shows multiple terminal sessions, each running in the selected project folder.
- A Logs tab is present and shows live app logs.

## Out of Scope
- Advanced terminal features (search, split panes, persisted tabs across restarts).
- Remote terminals or SSH.
- Editing log sources beyond internal app logs.
