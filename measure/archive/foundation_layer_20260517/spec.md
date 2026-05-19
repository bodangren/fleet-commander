# Specification: Foundation Layer

## Overview

Build the data layer and agent system that everything else depends on. This includes the Convex schema for all entities, agent role definitions, cost profiles, and basic CRUD operations.

## Reference

- **UI Mockup**: `measure/ui-mockups.html` — Sidebar (Team section), Agent cards, Provider table
- **Product Definition**: `measure/product.md` — Core Concepts, Agent Roles, Cost Model
- **Design System**: `DESIGN.md` — Linear design tokens for all UI components

## Requirements

### R1: Convex Schema

Define tables for all core entities:

**Projects**
- id, name, description, createdAt, updatedAt

**Sprints**
- id, projectId, name, status (planned/active/closed), budget, actualCost, pointsDelivered, taskCount, completedCount, createdAt, startedAt, closedAt

**Tasks**
- id, projectId, sprintId, title, description, storyPoints, status (backlog/ready/in_progress/for_review/merged/blocked), priority (low/med/high), costEstimate, actualCost, assigneeId, reviewerId, mergerId, createdAt, updatedAt

**Agents**
- id, name, role (architect/executor/reviewer/merger), skills[], model, costPerPoint, reliability, status (active/idle/blocked/offline), workload, maxWorkload, createdAt

**Providers**
- id, name, models[], status (active/rate_limited/idle), latency, createdAt

**PipelineRuns**
- id, taskId, stage (dispatch/architect/executor/reviewer/merger), agentId, startTime, endTime, cost, status (running/completed/failed), createdAt

**ABTests**
- id, name, agentRole, controlModel, treatmentModel, splitRatio, status (running/completed), sprintId, createdAt, completedAt

### R2: Agent System

Agent roles and cost profiles:

**Roles**: Architect, Executor, Reviewer, Merger

**Cost Profile**:
- costPerPoint: Derived from historical data (total cost / total points)
- model: Which LLM model the agent uses
- reliability: Success rate percentage
- avgDuration: Average time per task

**Default Agents** (from UI mockup):
- @alice: Frontend Lead, Architect role, Claude Opus, $4.20/pt
- @bob: Backend Lead, Executor role, Claude Sonnet, $2.10/pt
- @carol: QA Engineer, Reviewer role, GPT-4o, $1.80/pt
- @frank: Tech Writer, Executor role, Gemini, $1.20/pt

### R3: CRUD Operations

Basic queries and mutations:
- Projects: list, get, create, update
- Sprints: list, get, create, update, close
- Tasks: list, get, create, update, move (status change)
- Agents: list, get, create, update, updateStatus
- PipelineRuns: list, getByTask, create, update

## Acceptance Criteria

- [ ] Convex schema defined with all tables
- [ ] Agent roles and cost profiles implemented
- [ ] CRUD operations for all entities
- [ ] Default agents seeded in database
- [ ] TypeScript types generated correctly
