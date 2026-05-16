# Plugin System — Implementation Plan

> **Symphony Compliance:** Plugin hooks must integrate with Symphony lifecycle events (beforeRun, afterRun, afterCreate), not create a parallel hook system. Metadata tags can define plugin trigger conditions.

## Phase 1: Plugin API

- [ ] Define plugin manifest schema: name, version, entry, permissions, hooks, symphonyEvents
- [ ] `symphonyEvents` declares which lifecycle events the plugin subscribes to: `beforeRun`, `afterRun`, `afterCreate`, `onSessionResume`, `onRetry`
- [ ] Implement `PluginAPI` class: registerHook, registerRoute, registerTab, registerScoringFactor
- [ ] Hook system extends Symphony lifecycle: event emitter for `beforeRun`, `afterRun`, `afterCreate` plus plugin-specific events
- [ ] Route mounting: dynamic route registration on pivot HTTP server
- [ ] Tab registration: plugin tabs added to dashboard navigation
- [ ] Scoring factor registration: custom factors merged into dispatch scoring
- [ ] Tag-based triggers: plugins can register for tasks matching `#plugin:pluginName` tag
- [ ] Permission system: declare required permissions in manifest, enforced at runtime
- [ ] Write unit tests for API registration methods

## Phase 2: Plugin Loader

- [ ] Implement `PluginLoader`: scan `plugins/` directory for valid plugin packages
- [ ] Manifest validation: check required fields, verify entry point exists, validate `symphonyEvents` against known events
- [ ] Dynamic import of plugin entry point with PluginAPI injection
- [ ] Sandbox wrapper: restrict `fs`, `net`, `child_process` access for plugins (hooks run via orchestrator, not directly)
- [ ] File watcher on `plugins/` directory (chokidar or Bun.watch)
- [ ] Hot-load on file change: unload old version, load new version
- [ ] Plugin state management: enabled/disabled, error state, load time
- [ ] Write tests for loader: valid plugin, invalid manifest, missing entry, hot reload

## Phase 3: Example Plugins and Documentation

- [ ] Build Slack Notifications plugin: subscribe to `afterRun` lifecycle event, post on task completion/failure
- [ ] Build Jira Sync plugin: bidirectional task ↔ issue sync with field mapping, hook into `afterCreate`
- [ ] Build Custom Reports plugin: register dashboard tab with configurable report
- [ ] Plugin management UI: list with status, enable/disable toggle, subscribed Symphony events display, error log
- [ ] Plugin detail view: version, registered hooks, symphonyEvents, routes, permissions
- [ ] Write integration tests for each example plugin
- [ ] Add plugin development guide with Symphony lifecycle event reference
