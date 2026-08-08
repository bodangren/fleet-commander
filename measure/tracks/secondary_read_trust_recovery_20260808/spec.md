# Spec: Secondary read trust recovery

## Overview

Finish the P1 read-surface failures preserved in the original Fleet Commander audit. History, Diagnose, Analytics, Templates, and unknown URLs must resolve to truthful data, explicit empty/error states, or a real 404. This is a repair track, not a redesign: use the existing Convex records and React surfaces, remove false loading signals, and add no new product capability.

The graph context probe found the relevant boundaries in `frontend/src/hooks/useSprintHistory.ts`, `frontend/src/lib/convex-data/audit.ts`, `frontend/src/components/analytics/AgentHeatmap.tsx`, `convex/history/tasks.ts`, `convex/lib/analytics.ts`, and `frontend/src/router.tsx`. The current live backend proves three concrete defects:

- `history/tasks:listTaskHistoryHandler` rejects imported tasks because `dependencies` and other catalog fields are absent from its return validator.
- `audit:listAuditEvents` is not a public function; the implemented function is `audit:listAuditEventsHandler`.
- History pages pass an empty project ID, disabling their own Convex queries and eventually timing out.

## Functional Requirements

### FR-1: Project-scoped history resolves

- Sprint and task history must use the sole imported project automatically or an explicitly selected project.
- The current imported project must produce an immediate honest empty sprint-history state and a task-history list sourced from its 67 imported tasks.
- Imported task catalog fields must either be represented in the declared Convex return contract or deliberately adapted before return; validator drift may not be hidden in the UI.
- A missing/ambiguous project or query error must be distinguishable from loading.

### FR-2: Diagnose uses real public functions

- Audit Trail must subscribe to `audit:listAuditEventsHandler`.
- Reconciliation proposals must be scoped to the selected/sole imported project rather than an empty sentinel slug.
- Diagnose must leave all loading states on success, empty data, or error.

### FR-3: Analytics distinguishes loading from no observations

- An empty array is loaded empty data, never a spinner.
- Agent Utilization and Bottlenecks must show labeled empty states when no matching observations exist.
- Completion, queue, hook, and session charts must not render fabricated dated zero series when there are no source observations.
- Existing meaningful imported-task observations may remain densified across the selected date range.

### FR-4: Unknown routes are visible

- A URL that matches no application route must show a 404 page containing the attempted path.
- The 404 page must provide a link back to Portfolio.
- The router must not silently replace the attempted URL with Dashboard.

### FR-5: Templates is verified, not reimplemented

- Project Templates must use the existing public `projectTemplates:listProjectTemplatesHandler` contract.
- With no templates seeded, the page must settle to its honest empty state and retain explicit Seed Defaults functionality.
- No parallel REST templates implementation may be introduced.

### FR-6: Live acceptance remains fail-closed

- Add a non-mocked `@live` browser journey for every route changed by this track.
- Live E2E must reject failed Convex/core responses and permanent loading indicators.
- Mocked E2E remains separate and may not satisfy this track's acceptance.

## Non-Functional Requirements

- Convex remains canonical state; Pivot is not used to duplicate history or analytics reads.
- No project import, template seeding, sprint start, agent dispatch, or other mutation occurs during verification.
- Exported functions retain JSDoc; touched Convex functions retain strict args/returns validators.
- Prefer deletion or direct contract correction over adapters, polling layers, and new abstractions.

## Acceptance Criteria

1. `/history/sprints` settles to `No sprint history` for the current no-sprint project without timing out.
2. `/history/tasks` renders imported project tasks without a Convex validation error.
3. `/history/agents` settles to a finite empty or data state.
4. `/ops/diagnose` settles both Drift Detection and Audit Trail without `Loading audit events...` persisting.
5. `/analytics` contains no indefinite spinner for empty utilization/bottleneck data and clearly labels unavailable observations.
6. `/templates` settles to an empty/data state through the existing public Convex function.
7. `/this-route-does-not-exist` remains at that URL and shows a 404 with a Portfolio link.
8. Focused Convex/frontend tests, full Pivot/frontend suites, static checks, production build, graph update, and one real local-stack browser sweep are recorded in `plan.md`.

## Out of Scope

- Creating agents, configuring providers/models, starting or running a sprint, or dispatching the Pi executor.
- Redesigning History, Analytics, or navigation.
- Seeding default project templates during automated verification.
- Tailwind/Vite/ESLint/TypeScript upgrades.
- Broad Convex test-quarantine remediation (TD-263) or build-graph scanner repair (GitHub issue #2).
