# Agent Marketplace — Implementation Plan

## Phase 1: Agent Registry (Local)

- [ ] Define agent YAML schema and validation logic
- [ ] Build `listInstalledAgents` query (scan agents directory, parse YAML metadata)
- [ ] Build `installAgent` mutation (copy files to agents directory, validate schema)
- [ ] Build `uninstallAgent` mutation (remove files, check for active tasks)
- [ ] Create agent YAML template with all required fields
- [ ] Write unit tests for install/uninstall/validation flows
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
- [ ] Build `AgentCard` component (name, model, capabilities, version)
- [ ] Build `AgentDetailView` page (full metadata, prompt preview, actions)
- [ ] Build install/uninstall action buttons with confirmation dialogs
- [ ] Add search bar and capability/tag filter controls
- [ ] Wire UI to Convex queries and mutations
- [ ] End-to-end test: browse → view details → install → verify in list
