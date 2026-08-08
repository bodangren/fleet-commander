# Spec: Core workflow recovery

## Overview

Restore one trustworthy Fleet Commander workflow for the imported `reading-advantage-llm-benchmark` repository: Portfolio -> Dashboard/Project -> Sprint Planning -> Board. The fix must prefer a small, canonical path over maintaining parallel Bun, Convex, mock, and legacy representations.

This is a classic bug-recovery track. The live audit that defines the baseline and the broader follow-up plan are preserved in [audit-report.md](./audit-report.md).

## Functional Requirements

### FR-1: Canonical project identity

- Portfolio navigation must use an identifier that Project View can resolve.
- Project APIs may accept a slug at the HTTP boundary, but must resolve it to a typed Convex project ID before calling ID-validated functions.
- Project View must show the imported project and its imported tracks/tasks instead of metadata-only or `Load error` output.

### FR-2: Validator-safe core reads

- Dashboard, sprint-planning backlog, and performance phase-breakdown functions must return objects that exactly match their declared Convex validators.
- A regression test must cover each previously failing live response.

### FR-3: One imported task catalog

- Dashboard, Project View, Sprint Planning, Board/Monitor counts, and project statistics must agree on the imported task catalog.
- For the current fixture, Sprint Planning must display the 67 imported backlog tasks rather than reporting 67 and rendering none.
- No new parallel task-import or board implementation may be introduced.

### FR-4: Explicit import and explicit errors

- Rendering or navigating a read-only route must not call `POST /api/projects/scan-and-import`.
- Import/re-import remains available only through an explicit user action.
- Failed reads must produce a visible error or retry state; permanent unlabeled spinners are not acceptable.

### FR-5: Immediate route wiring cleanup

- Register provider read routes or remove the Providers navigation entry until they exist.
- Fix the custom harness creation link so it reaches the registered editor route.
- Quality routes must use a real selected/imported project slug, not hardcoded `demo-project`.
- Project Templates must not silently call a missing public Convex function; either wire the function or present an explicit unavailable state.

### FR-6: Trustworthy verification

- Add at least one non-mocked integration/smoke check for the core read journey.
- Existing mocked Playwright tests may remain for UI interaction coverage, but cannot be the sole acceptance evidence.
- The live browser verification must cover Portfolio, Dashboard, Project View, Sprint Planning, and Board against the running local stack.

## Non-Functional Requirements

- Convex remains the canonical runtime state. Pivot owns filesystem/process side effects and typed HTTP boundary adaptation.
- No schema migration, deployment, destructive database operation, or automatic sprint start is part of this track.
- Exported functions retain JSDoc and all touched Convex functions retain argument and return validators.
- Scope must remain smaller than the audited product surface: repair the core vertical slice and gate unrelated broken features rather than redesigning them.

## Acceptance Criteria

1. `/` does not remain on `Loading dashboard...`.
2. `/portfolio` lists the imported project without issuing an import POST.
3. Clicking the imported project opens a usable Project View with imported work visible.
4. `/sprint-planning` shows the same imported backlog count and task rows, with no recommendation 500.
5. `/board` can select the imported project and renders an honest pre-sprint state backed by the same catalog.
6. Dashboard, project-detail, planning-recommendation, performance-phase-breakdown, and provider reads no longer return the audited 500/404 failures.
7. Focused Pivot, frontend, and Convex tests pass; the live core-route browser smoke passes.
8. `graph.db` is updated for changed source files and Measure verification results are recorded in `plan.md`.

## Out of Scope

- Rebuilding analytics, history, retrospectives, or optimization features.
- Starting a real sprint or dispatching agents against the imported repository during verification.
- Fixing the quarantined Convex suite wholesale (TD-263).
- Tailwind, Vite, ESLint, or TypeScript upgrades.
- Restoring removed A/B testing or policy-simulation product surfaces.

