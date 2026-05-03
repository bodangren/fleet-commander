# Agent Marketplace — Implementation Plan

> **Symphony Compliance:** Agent YAML schema must declare lifecycle hook support and session persistence compatibility. `harnessProfiles` schema (which stores hooks) is the source of truth.

## Phase 1: Agent Registry (Local)

- [ ] Define agent YAML schema with Symphony fields: `hooks.beforeRun`, `hooks.afterRun`, `hooks.afterCreate`, `sessionPersistence: boolean`
- [ ] Add schema validation for hook commands (must be valid shell strings, max length)
- [ ] Build `listInstalledAgents` query (scan agents directory, parse YAML metadata)
- [ ] Build `installAgent` mutation (copy files to agents directory, validate schema including hook fields)
- [ ] Build `uninstallAgent` mutation (remove files, check for active tasks and sessions)
- [ ] Create agent YAML template with all required fields including hook examples
- [ ] Write unit tests for install/uninstall/validation flows (including hook field validation)
- [ ] Add agent definitions to gitignore or track strategy decision

## Phase 2: Remote Registry Support

- [ ] Build `fetchRemoteAgent` function (HTTP fetch from URL)
- [ ] Implement SHA-256 hash verification for downloaded packages
- [ ] Add version field to agent YAML schema
- [ ] Build `checkForUpdates` query (compare local vs remote versions)
- [ ] Build `installFromRemote` mutation (fetch, verify, install)
- [ ] Add remote registry URL configuration
- [ ] Write tests for fetch, hash verification, and version comparison

## Phase 3: Dashboard UI

- [ ] Build `AgentBrowseView` page with grid/list layout
- [ ] Build `AgentCard` component (name, model, capabilities, version, hook badges showing which lifecycle hooks are configured)
- [ ] Build `AgentDetailView` page (full metadata, prompt preview, hook configuration display, session persistence indicator, actions)
- [ ] Build install/uninstall action buttons with confirmation dialogs
- [ ] Add search bar and capability/tag filter controls
- [ ] Wire UI to Convex queries and mutations
- [ ] End-to-end test: browse → view details → install → verify in list
