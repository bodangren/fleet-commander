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

- [x] Task: Implement agent roles and cost profiles (commit fea5423)
    - [x] Create `convex/agents.ts` with CRUD operations
    - [x] Implement costPerPoint calculation from historical data
    - [x] Add agent status management (active/idle/blocked/offline)
    - [x] Seed default agents (@alice, @bob, @carol, @frank)
    - [x] Test agent queries and mutations

## Phase 3: Project & Sprint CRUD

- [x] Task: Implement project and sprint operations (commit c40d165)
    - [x] Create `convex/projects.ts` with CRUD
    - [x] Create `convex/sprints.ts` with status transitions
    - [x] Implement sprint budget tracking
    - [x] Add sprint close with metrics calculation
    - [x] Test project and sprint operations

## Phase 4: Task CRUD

- [x] Task: Implement task operations (commit f2eca7f)
    - [x] Create `convex/tasks.ts` with CRUD
    - [x] Implement task status transitions
    - [x] Add cost estimation based on story points × agent cost
    - [x] Implement task assignment to agents
    - [x] Test task operations

## Phase 5: Pipeline Runs

- [x] Task: Implement pipeline run tracking (commit 3cb3256)
    - [x] Create `convex/pipelineRuns.ts` with CRUD
    - [x] Add stage transition tracking
    - [x] Implement cost accumulation per stage
    - [x] Test pipeline run operations

## Phase 6: Provider CRUD

- [x] Task: Implement provider operations (commit be064e1)
    - [x] Create `convex/providers.ts` with CRUD
    - [x] Add provider status management
    - [x] Test provider operations
