# Spec: Custom Agent Templates

## Problem
Agents are hardcoded in the system. Users cannot define their own agent personas, skills, or model preferences. This limits the "virtual software house" vision where teams have diverse roles.

## Solution
Allow users to create, edit, and clone custom agent templates with: name, role, model, temperature, system prompt, skills list, and cost profile.

## Acceptance Criteria
- [ ] `agentTemplates` table in Convex with CRUD mutations/queries
- [ ] Template fields: name, role (Architect/Executor/Reviewer/Merger), model, temperature, systemPrompt, skills[], estimatedCostPer1kTokens
- [ ] UI: template list, create/edit form, clone action, delete with usage check
- [ ] Scheduler uses templates when dispatching tasks (fallback to default if no custom agents)
- [ ] Validation: model must be from supported list, role required, name unique per workspace

## Out of Scope
- Real-time cost profiling (use static estimates)
- Agent marketplace/sharing across workspaces
- Multi-modal agents (vision, audio)
