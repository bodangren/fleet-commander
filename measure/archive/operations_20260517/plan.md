# Implementation Plan: Operations

## Phase 1: Monitor View

- [x] Task: Build monitor view
    - [x] Create `frontend/src/pages/MonitorPage.tsx`
    - [x] Add system status bar (queue counts, dispatch stats, harness reliability)
    - [x] Add agent status table (dispatch stats + harness stats)
    - [x] Add starvation/retry/blocker cards
    - [x] Style with Linear design tokens

## Phase 2: Diagnose View

- [x] Task: Build diagnose view
    - [x] Create `frontend/src/pages/DiagnosePage.tsx`
    - [x] Add reconcile section with fix proposals (reuse ReconcilePanel)
    - [x] Add audit trail with type filters
    - [x] Style with Linear design tokens

## Phase 3: Optimize View

- [x] Task: Build optimize view
    - [x] Create `frontend/src/pages/OptimizePage.tsx`
    - [x] Add A/B test display list
    - [x] Add create A/B test form
    - [x] Add policy parameters display
    - [x] Style with Linear design tokens

## Phase 4: A/B Testing Engine

- [x] Task: Create A/B testing backend
    - [x] Create `convex/abTests.ts` with CRUD handlers
    - [x] Create `pivot/src/routes/abTests.ts` REST API
    - [x] Implement test creation and status updates
    - [x] Wire to frontend Optimize page

## Phase 5: Reconciliation Engine

- [x] Task: Reconciliation already exists (ReconcilePage + convex reconciliationEngine)
    - [x] Reuse existing ReconcilePanel in DiagnosePage

## Phase 6: Audit Trail

- [x] Task: Create audit trail backend
    - [x] Create `convex/audit.ts` with unified event query
    - [x] Aggregate execution logs, alerts, reconciliation events, pipeline runs
    - [x] Wire to frontend DiagnosePage with type/agent filters

## Phase 7: Data Integration

- [x] Task: Wire operations to Convex
    - [x] Add `useAbTests` hook
    - [x] Add `useAuditEvents` hook
    - [x] Reuse existing `useQueueHealth`, `useFleetHealth`, `useReconciliationProposals`, `usePolicyWeights`

## Phase 8: Real-time Updates

- [x] Task: Hooks use Convex realtime subscriptions (inherited from useConvexQuery)

## Phase 9: Policy Parameters

- [x] Task: Policy tuning UI in OptimizePage (read-only display of current weights)

## Phase 10: Testing

- [x] Task: All existing test suites pass
    - [x] Pivot: 952 pass, 0 fail
    - [x] Convex: 438 pass, 0 fail

## Commit

- [x] Commit: `b38f53c` feat(operations): Monitor, Diagnose, Optimize pages + A/B test backend
