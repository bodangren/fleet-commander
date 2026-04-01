# Specification - Frontend Migration to Convex-Backed Data Flows

## Overview

The current `frontend/` Vite application remains the primary user interface, but much of its data access assumes legacy Go/SQLite APIs and websocket fanout behavior. This track migrates the existing frontend to consume Convex-backed read/write flows and reactive subscriptions for the migrated runtime slices.

This is explicitly a migration of the current frontend, not a throwaway rewrite into the temporary slice UI.

## Motivation

- The pivot baseline proved Bun + Convex viability, but the main user-facing app is still coupled to outgoing runtime assumptions.
- Running parallel UI surfaces increases drift and slows cutover unless the main frontend becomes Convex-native.
- Realtime behaviors should use Convex subscriptions for migrated slices to reduce bespoke hub logic.

## Functional Requirements

- **FR1**: Preserve `frontend/` as the primary app shell while progressively replacing legacy data hooks with Convex-backed hooks.
- **FR2**: Migrate project registry/list views to Convex-backed reads and writes.
- **FR3**: Migrate at least one track/task flow and one execution-log flow to Convex-backed queries/subscriptions.
- **FR4**: Replace at least one websocket-dependent UI path with Convex subscription semantics.
- **FR5**: Keep existing UX parity for migrated pages (no regressions in key interactions).
- **FR6**: Maintain clear boundary between frontend presentation and runtime adapters (Bun bridge vs Convex direct usage).
- **FR7**: Include tests for migrated hooks/components and update test fixtures away from SQLite-first assumptions for migrated slices.

## Acceptance Criteria

1. Existing Vite frontend boots and serves migrated pages with Convex-backed data paths.
2. Project list + one additional domain slice (tracks/tasks or logs) read from Convex in the main frontend.
3. At least one UI refresh path uses Convex reactive updates rather than legacy websocket broadcast logic.
4. Frontend tests cover migrated hooks/components and pass.
5. Migration notes identify which pages remain on legacy adapters and which are fully Convex-backed.

## Non-Goals

- Full frontend parity migration for every page in one pass.
- Decommissioning all Go handlers in this track (that is handled by cutover/decommission tracks).
- Visual redesign of the dashboard.

## Risks and Constraints

- Existing component tests may be tightly coupled to current API mocks and will need careful fixture migration.
- A mixed adapter period is expected; explicit feature flags or adapter boundaries are required to avoid hidden coupling.
- Convex auth/provider strategy for frontend contexts must stay aligned with runtime decisions.
