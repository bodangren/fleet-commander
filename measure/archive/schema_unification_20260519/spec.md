# Specification: Schema Unification

## Overview

`convex/schema.ts` contains duplicate definitions for `projects`, `sprints`, `tasks`, and `agents`. The second (foundation) definition silently overwrites the first at runtime. This creates a split-brain where ~20 backend files and frontend hooks reference fields that do not exist in the active schema.

This track removes the duplicate definitions, deletes the broken old-schema handlers, and updates the pivot API routes and frontend to use the foundation schema exclusively.

## Functional Requirements

1. **Remove duplicate table definitions** from `schema.ts`
2. **Remove broken old-schema handlers** from `projects.ts` and `sprints.ts`
3. **Fix schema test** that asserts agents table does not exist
4. **Update pivot API routes** to use foundation handlers
5. **Remove dead old-schema frontend hooks**

## Acceptance Criteria

- [ ] `convex/schema.ts` has only one definition per table
- [ ] No handlers in `projects.ts` or `sprints.ts` reference `slug`, `projectSlug`, `taskKey`, `by_slug`, `by_taskKey`, etc.
- [ ] `convex/schema.test.ts` passes
- [ ] Pivot `/api/projects` routes use foundation handlers
- [ ] `measure/tech-debt.md` updated: TD-078 and TD-079 marked resolved

## Out of Scope

- Full migration of old orchestration files (fleet.ts, tracks.ts, issues.ts, etc.) — these remain as known dead code for a future cleanup track
- Fixing unrelated pre-existing TypeScript errors in performance tests
- Frontend components that already fall back to pivot API
