# Specification - Agent Registry UI

## Overview

The Agent Registry UI enables users to configure AI agent personas with system prompts, LLM settings, and tool permissions. It provides full CRUD operations with layered storage (user-global > project > bundled).

## Functional Requirements

### FR1: Agent Listing
- List all available agents with their layer origin (bundled/user/project)
- Display agent name, model, and layer badge
- Filter by layer

### FR2: Agent Editor
- Edit system prompt (textarea)
- Configure model dropdown with discovered models from harnesses
- Set temperature (0.0-2.0 slider)
- Define tool permissions (checkboxes for available tools)

### FR3: Layer Management
- Clone bundled agents to user or project layer
- Reset agent to bundled defaults
- Delete custom agents (user/project layer only)

### FR4: Agent Testing
- Test agent with a simple prompt via harness
- Display streaming output in UI

## Acceptance Criteria

1. ListView shows all agents with layer badges
2. EditView saves to correct layer (user ~/measure/agents/ or project measure/agents/)
3. Clone creates copy in target layer
4. Reset removes customizations, restores bundled version
5. Test runs agent with harness and streams output

## Out of Scope

- Advanced prompt templates (tracked separately)
- Agent analytics/usage metrics (tracked separately)