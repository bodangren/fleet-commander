# Implementation Plan: Foundation Layer

## Phase 1: Schema Definition

- [x] Task: Define Convex schema for all entities (commit caf4f7a)
    - [x] Create `convex/schema.ts` with Projects table
    - [x] Add Sprints table with status and budget fields
    - [x] Add Tasks table with story points and cost fields
    - [x] Add Agents table with role and cost profile
    - [x] Add Providers table with model assignments
    - [x] Add PipelineRuns table with stage tracking
    - [x] Add ABTests table for experiments
    - [x] Run `npx convex dev` to generate types

## Phase 2: Agent System

- [~] Task: Implement agent roles and cost profiles
    - [~] Create `convex/agents.ts` with CRUD operations
    - [~] Implement costPerPoint calculation from historical data
    - [~] Add agent status management (active/idle/blocked/offline)
    - [~] Seed default agents (@alice, @bob, @carol, @frank)
    - [~] Test agent queries and mutations

## Phase 3: Project & Sprint CRUD

- [ ] Task: Implement project and sprint operations
    - [ ] Create `convex/projects.ts` with CRUD
    - [ ] Create `convex/sprints.ts` with status transitions
    - [ ] Implement sprint budget tracking
    - [ ] Add sprint close with metrics calculation
    - [ ] Test project and sprint operations

## Phase 4: Task CRUD

- [ ] Task: Implement task operations
    - [ ] Create `convex/tasks.ts` with CRUD
    - [ ] Implement task status transitions
    - [ ] Add cost estimation based on story points × agent cost
    - [ ] Implement task assignment to agents
    - [ ] Test task operations

## Phase 5: Pipeline Runs

- [ ] Task: Implement pipeline run tracking
    - [ ] Create `convex/pipelineRuns.ts` with CRUD
    - [ ] Add stage transition tracking
    - [ ] Implement cost accumulation per stage
    - [ ] Test pipeline run operations

## Phase 6: Provider CRUD

- [ ] Task: Implement provider operations
    - [ ] Create `convex/providers.ts` with CRUD
    - [ ] Add provider status management
    - [ ] Test provider operations
