# Specification — Ops Console (B4)

## Overview

Dedicated operations surface distinct from the Kanban project view. Governing an autonomous system requires views that existing project-focused pages don't provide. This track adds four panels: Queue Health, Persona/Harness Health, Run Timeline (cross-task), Drift/Governance.

Run Timeline per-task exists from A5; this adds the cross-task feed.

## Functional Requirements

- **FR1:** New top-level route `/ops` in frontend with four tabs: Queue, Fleet, Timeline, Governance.
- **FR2:** **Queue tab:** ready count, blocked count, starvation index (longest-waiting ready task age), retry hotspots (top 5 tasks by retry count), blocker age p50/p90, issue routing latency.
- **FR3:** **Fleet tab:** table of personas and harnesses with pass rate, fail rate, review-rejection rate, median duration, cost per accepted task, top 3 failure modes. Columns sortable.
- **FR4:** **Timeline tab:** chronological stream of recent dispatches (last 100) with link to A5 per-task timeline.
- **FR5:** **Governance tab:** out-of-sync artifact count (from A4), budget breaches (from B3 governance events), policy-version changes (from B2 policyWeights), manual overrides executed.
- **FR6:** Live updates via Convex subscriptions; heavy rollups reuse B1 cached values, not recomputed client-side.
- **FR7:** Each tab includes a "Last updated" indicator and a manual refresh.

## Acceptance Criteria

1. Route `/ops` renders with tab navigation; keyboard nav (1–4 switches tabs).
2. Queue tab metrics computed from live Convex queries; starvation index matches fixture test.
3. Fleet tab reads B1 rollups directly; no client-side aggregation of raw contracts.
4. Timeline tab links to A5 task timeline on row click.
5. Governance tab surfaces all four event classes with filters.
6. Empty states: "No drift detected", "No budget breaches", etc., styled per product-guidelines.
7. Renderer test coverage ≥ 80%.
8. `npm run check` clean.

## Out of Scope

- Editing policy weights from UI (future).
- Exporting ops data (future).
- Mobile layout (deferred per consultant).

## Tech Stack

- **React:** existing frontend
- **Live data:** Convex subscriptions
- **Charts:** Recharts (already in tree)
