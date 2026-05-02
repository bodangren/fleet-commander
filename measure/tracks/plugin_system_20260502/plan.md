# Plugin System — Implementation Plan

## Phase 1: Plugin API

- [ ] Define plugin manifest schema: name, version, entry, permissions, hooks
- [ ] Implement `PluginAPI` class: registerHook, registerRoute, registerTab, registerScoringFactor
- [ ] Hook system: event emitter pattern for lifecycle events (task.*, agent.*, orchestrator.*)
- [ ] Route mounting: dynamic route registration on pivot HTTP server
- [ ] Tab registration: plugin tabs added to dashboard navigation
- [ ] Scoring factor registration: custom factors merged into dispatch scoring
- [ ] Permission system: declare required permissions in manifest, enforced at runtime
- [ ] Write unit tests for API registration methods

## Phase 2: Plugin Loader

- [ ] Implement `PluginLoader`: scan `plugins/` directory for valid plugin packages
- [ ] Manifest validation: check required fields, verify entry point exists
- [ ] Dynamic import of plugin entry point with PluginAPI injection
- [ ] Sandbox wrapper: restrict `fs`, `net`, `child_process` access for plugins
- [ ] File watcher on `plugins/` directory (chokidar or Bun.watch)
- [ ] Hot-load on file change: unload old version, load new version
- [ ] Plugin state management: enabled/disabled, error state, load time
- [ ] Write tests for loader: valid plugin, invalid manifest, missing entry, hot reload

## Phase 3: Example Plugins and Documentation

- [ ] Build Slack Notifications plugin: hook task.completed and task.failed, post via Slack API
- [ ] Build Jira Sync plugin: bidirectional task ↔ issue sync with field mapping
- [ ] Build Custom Reports plugin: register dashboard tab with configurable report
- [ ] Plugin management UI: list with status, enable/disable toggle, error log
- [ ] Plugin detail view: version, registered hooks, routes, permissions
- [ ] Write integration tests for each example plugin
- [ ] Add plugin development guide with API reference
