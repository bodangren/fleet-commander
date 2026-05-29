# Plan: Custom Agent Templates

## Phase 1: Schema & Backend
- [x] Task: Add `agentTemplates` table to Convex schema
- [x] Task: Implement CRUD mutations with validation
- [x] Task: Update scheduler to query templates instead of hardcoded agents
- [x] Task: Write Convex tests for CRUD and scheduler integration

## Phase 2: UI
- [x] Task: Build template list page with search/filter
- [x] Task: Build template create/edit form
- [x] Task: Add clone and delete actions
- [x] Task: Wire into project settings navigation

## Phase 3: Default Templates
- [x] Task: Create seed data for default templates (Alice, Bob, Carol, Frank)
- [x] Task: Migration: existing projects get default templates auto-assigned

## Phase 4: Verification
- [x] Task: Manual test: create custom agent, assign to task, verify scheduler picks it
- [x] Task: Run full test suite
- [x] Task: Commit and push
