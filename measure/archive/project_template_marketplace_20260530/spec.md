# Spec: Project Template Marketplace

## Problem
Every new project starts from scratch. Users must manually create tasks, set up agent assignments, and configure story points. There is no way to bootstrap a project from a proven configuration, leading to repetitive setup and inconsistent sprint structures.

## Solution
A template marketplace where users can create projects from pre-built templates. Templates include: initial task board, default agent assignments, story point estimates, and sprint budget recommendation. Users can create custom templates from existing projects and share them within their workspace.

## Acceptance Criteria
- [ ] New `projectTemplates` table in Convex: name, description, category, tasks[], defaultAgents[], estimatedBudget
- [ ] Built-in templates: "Web App (Next.js)", "API Service (Bun/Hono)", "Python CLI", "Documentation Site"
- [ ] New project flow: "Create from Template" option alongside blank project
- [ ] Template instantiation: creates project, copies tasks to backlog, sets default agents, recommends budget
- [ ] Custom template creation: "Save as Template" from any existing project (strips task content, keeps structure)
- [ ] Template gallery UI: grid view with category filters, search, preview task count
- [ ] Template detail modal: shows task list, agent roles, estimated budget before creation

## Out of Scope
- Public template sharing across workspaces
- Template versioning or update propagation
- Import from external tools (Jira, Linear, GitHub Projects)
