# Specification: Type Deduplication

## Overview

Structural analysis uncovered duplicate interface definitions across `convex/lib/*.ts` and parallel type definitions in `frontend/src/lib/fleetTypes.ts` that mirror Convex schema shapes. This track consolidates duplicates, extracts shared domain types, and audits the frontend for type drift against Convex generated types.

## Motivation

- `TaskDoc`, `WorkRunDoc`, and `OrchestratorErrorDoc` are defined in both `convex/lib/analytics.ts` and `convex/lib/retrospective.ts`
- `frontend/src/lib/fleetTypes.ts` defines 28+ types (`Employee`, `Project`, `Task`, etc.) that shadow Convex schema shapes
- `useAgentForm.ts` and `useProjectView.ts` each define 5–6 local return types with no reuse
- Type drift risk: frontend types can desync from backend schema changes

## Functional Requirements

### R1: Consolidate Convex Library Duplicates

- Extract shared document interfaces from `convex/lib/analytics.ts` and `convex/lib/retrospective.ts` into `convex/lib/types.ts`
- Delete duplicate definitions; update imports in consuming files
- Ensure no runtime behavior changes

### R2: Audit Frontend Type Drift

- Compare `frontend/src/lib/fleetTypes.ts` against `_generated/api.d.ts`
- Identify types that are exact duplicates of generated Convex types
- Replace frontend duplicates with imports from `convex/_generated/api` where possible
- Document intentional divergences (e.g., presentation-layer types that add UI-specific fields)

### R3: Extract Reusable Hook Types

- Identify hook return types defined inline that are reused or could be reused
- Extract to `frontend/src/hooks/types.ts` or co-locate with the hook in a `types.ts` file
- Keep page-specific prop types in their respective page files

## Acceptance Criteria

- [ ] `convex/lib/analytics.ts` and `convex/lib/retrospective.ts` import shared types from `convex/lib/types.ts`
- [ ] No duplicate `TaskDoc`, `WorkRunDoc`, or `OrchestratorErrorDoc` definitions remain
- [ ] `frontend/src/lib/fleetTypes.ts` has been audited; exact duplicates replaced with `_generated` imports
- [ ] `bun --cwd pivot typecheck` passes
- [ ] `bun --cwd frontend check` passes
- [ ] `bun --cwd pivot test` passes
- [ ] `bun --cwd frontend test` passes
