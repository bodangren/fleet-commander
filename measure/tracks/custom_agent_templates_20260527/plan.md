# Plan: Custom Agent Templates

## Phase 1: Schema & Backend
- [ ] Task: Add `agentTemplates` table to Convex schema
- [ ] Task: Implement CRUD mutations with validation
- [ ] Task: Update scheduler to query templates instead of hardcoded agents
- [ ] Task: Write Convex tests for CRUD and scheduler integration

## Phase 2: UI
- [ ] Task: Build template list page with search/filter
- [ ] Task: Build template create/edit form
- [ ] Task: Add clone and delete actions
- [ ] Task: Wire into project settings navigation

## Phase 3: Default Templates
- [ ] Task: Create seed data for default templates (Alice, Bob, Carol, Frank)
- [ ] Task: Migration: existing projects get default templates auto-assigned

## Phase 4: Verification
- [ ] Task: Manual test: create custom agent, assign to task, verify scheduler picks it
- [ ] Task: Run full test suite
- [ ] Task: Commit and push
