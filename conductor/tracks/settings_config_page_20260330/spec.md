# Specification - Settings & Configuration Page

## Overview

Add a centralized settings page and backend configuration system. Currently configuration is scattered across hardcoded values and a project list file. This track creates a `~/.conductor/config.json` managed by a `ConfigManager`, exposes settings via a REST API, and provides a frontend settings page accessible from the sidebar.

## Functional Requirements

- **FR1**: A `/settings` route in the React frontend renders a settings page accessible from the AppLayout sidebar.
- **FR2**: General settings section with fields for: default agent, orchestrator auto-run interval (seconds), and log retention days.
- **FR3**: Harness settings section with fields for: discovery cache TTL (seconds) and default harness.
- **FR4**: WebSocket settings section with field for: reconnection interval (milliseconds).
- **FR5**: Backend persists settings to `~/.conductor/config.json` via a new `ConfigManager` type in `internal/config/`, supporting `Get`, `Set`, and `Load` operations.
- **FR6**: Settings changes take effect without restart where possible (orchestrator interval, log retention, cache TTL, WS reconnection).

## Acceptance Criteria

1. Navigating to `/settings` renders the settings page with all four sections.
2. `GET /api/settings` returns the current configuration as JSON.
3. `PUT /api/settings` accepts partial updates and persists them to `~/.conductor/config.json`.
4. Changing the orchestrator auto-run interval updates the running orchestrator's tick interval without restart.
5. Changing log retention takes effect on the next cleanup cycle.
6. Changing WebSocket reconnection interval updates the client on next reconnect.
7. Settings page shows a success toast on save and validation errors for invalid values.
8. Default values are populated on first load when no config file exists.

## Out of Scope

- Per-project settings overrides.
- User authentication or role-based settings access.
- Import/export of configuration files.
