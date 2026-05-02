# Agent Marketplace

## Overview

Browse, install, and share agent persona definitions. Provides a local-first registry of agent configurations (YAML + markdown) with optional remote registry support for sharing across Fleet Commander instances.

## Functional Requirements

1. **Agent Registry (Local)**
   - Agent definitions stored as YAML + markdown in `pivot/src/agents/`
   - Registry reads agent directory and extracts metadata (name, model, capabilities, description)
   - List installed agents with status and metadata
   - Install agent: copy definition files to agents directory
   - Uninstall agent: remove definition files (with safety check for active tasks)

2. **Remote Registry Support**
   - Fetch agent definitions from a remote URL (registry endpoint or direct URL)
   - Hash verification (SHA-256) for downloaded agent packages
   - Version tracking (agent definitions have semantic versions)
   - Update check: compare local vs remote versions

3. **Agent Definition Format**
   - YAML config: `{ name, version, model, capabilities[], description, author, tags[] }`
   - Markdown prompt file: system prompt / persona instructions
   - Validation: schema check on install

4. **Dashboard UI**
   - Browse view: grid/list of available agents with metadata cards
   - Agent detail view: full description, capabilities, version, prompt preview
   - Install/uninstall actions with confirmation
   - Search and filter by capability, model, tags

## Data Sources

- `pivot/src/agents/` — local agent definition files
- Agent YAML metadata files
- Remote registry endpoint (configurable URL)

## Acceptance Criteria

- [ ] `listAgents` returns all installed agents with correct metadata
- [ ] Install copies files and agent appears in list immediately
- [ ] Uninstall removes files; active tasks on that agent are handled safely
- [ ] Remote fetch downloads and verifies hash correctly
- [ ] Dashboard shows browse, detail, install, uninstall flows
- [ ] Invalid agent YAML rejected with clear error message

## Out of Scope

- Agent marketplace with public sharing / publishing
- Agent auto-update (pull-based only, user-initiated)
- Agent testing/validation sandbox before install
- Monetization or licensing for agent definitions
