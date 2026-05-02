# Plugin System

## Overview

Extensible plugin API allowing third-party extensions to add routes, dashboard tabs, orchestrator hooks, and custom scoring factors. Plugins loaded from a local registry directory with hot-loading support.

## Functional Requirements

1. **Plugin API**
   - Plugin manifest: name, version, entry point, permissions, hooks
   - Hook registration: lifecycle events (task.created, task.completed, agent.error, etc.)
   - Route mounting: plugins can register HTTP routes under `/api/plugins/:name/`
   - Dashboard tabs: plugins can register UI tabs rendered in the dashboard
   - Custom scoring factors: plugins can contribute to dispatch scoring
   - API surface: `registerHook`, `registerRoute`, `registerTab`, `registerScoringFactor`

2. **Plugin Loader**
   - Discover plugins from `plugins/` directory (each plugin is a subdirectory)
   - Validate plugin manifest and entry point on load
   - Sandbox: plugins run with limited API access (no direct filesystem/network)
   - Hot-loading: detect new/changed plugins, reload without restart
   - Plugin enable/disable toggle per plugin

3. **Example Plugins**
   - Slack Notifications: post to Slack channel on task completion/failure
   - Jira Sync: bidirectional sync between Fleet Commander tasks and Jira issues
   - Custom Reports: add dashboard tab with configurable report generator

4. **Plugin Management UI**
   - List installed plugins with status (enabled/disabled/error)
   - Enable/disable toggle per plugin
   - Plugin details: version, hooks registered, routes mounted, permissions
   - Error log for failed plugin loads

## Data Sources

- `plugins/` directory — plugin packages
- Orchestrator lifecycle events — hook triggers
- Existing Convex tables — plugin access via controlled API

## Acceptance Criteria

- [ ] Plugin can register hooks that fire on lifecycle events
- [ ] Plugin can mount HTTP routes accessible under `/api/plugins/:name/`
- [ ] Plugin can register a dashboard tab with custom UI
- [ ] Hot-loading: new plugin detected and loaded within 5s without restart
- [ ] Plugin sandbox prevents direct filesystem and network access
- [ ] All 3 example plugins functional
- [ ] Plugin management UI shows status and allows enable/disable

## Out of Scope

- Plugin marketplace or npm registry integration
- Plugin dependency management between plugins
- Plugin versioning and update mechanism
- Remote plugin loading (only local directory)
