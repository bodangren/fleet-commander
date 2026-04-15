# Specification — State Reconciliation Engine (C1)

## Overview

A4 observes drift; C1 enforces resolution. Define canonical source, export target, import rules, and merge semantics per artifact class. Add a Reconcile UI where users apply or reject proposed patches.

## Functional Requirements

- **FR1:** `reconciliationRules` config (checked into repo at `conductor/reconciliation.yml`) defines per-artifact-class ownership:
  - `canonicalSource`: convex | markdown
  - `exportTarget`: file-path pattern | none
  - `importAllowed`: list of field paths that may flow from markdown → convex
  - `conflictStrategy`: reject | prefer_canonical | prefer_export | manual
- **FR2:** Reconciler reads A4 events, computes proposed patches per rule, writes them to `reconciliationProposals` table.
- **FR3:** Auto-apply when strategy is `prefer_canonical` or `prefer_export` and patch is schema-valid.
- **FR4:** Manual strategy queues proposal for UI review; user can apply, reject, or edit.
- **FR5:** Reconcile UI at `/ops/reconcile` lists pending proposals with diff view, source side, reason, apply/reject actions.
- **FR6:** Applied patches write atomically (transaction) and clear corresponding A4 event.
- **FR7:** Rejection records a `reconciliationDecisions` row with reason so the same drift isn't re-proposed indefinitely.
- **FR8:** Artifact integrity check on startup: any artifact missing from canonical side triggers a proposal.

## Acceptance Criteria

1. `conductor/reconciliation.yml` with rules for task, track metadata, issue, plan.
2. `reconciliationProposals` and `reconciliationDecisions` tables in Convex.
3. `pivot/src/reconciliation/engine.ts` produces proposals from A4 events.
4. Auto-apply path exercised in integration test for each `prefer_*` strategy.
5. Manual-strategy path surfaces in UI; apply/reject round-trips correctly.
6. Rejected divergence stops generating new proposals until underlying hash changes.
7. Atomic application: if either side of a patch fails, neither commits.
8. 80%+ coverage on engine; renderer ≥ 80% for reconcile UI.

## Out of Scope

- Multi-user concurrent resolution.
- Undo of applied patches (covered by git).
- Non-markdown artifact classes.

## Tech Stack

- **Rules:** YAML config
- **Engine:** `pivot/src/reconciliation/engine.ts`
- **UI:** new `/ops/reconcile` under B4 ops surface
