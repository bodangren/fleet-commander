# Implementation Plan: Operations

## Phase 1: Monitor View

- [ ] Task: Build monitor view
    - [ ] Create `frontend/src/pages/MonitorPage.tsx`
    - [ ] Add system status bar
    - [ ] Add queue depth chart
    - [ ] Add pipeline throughput chart
    - [ ] Add agent status table
    - [ ] Style with Linear design tokens

## Phase 2: Diagnose View

- [ ] Task: Build diagnose view
    - [ ] Create `frontend/src/pages/DiagnosePage.tsx`
    - [ ] Add reconcile section with fix proposals
    - [ ] Add audit trail with filters
    - [ ] Add root cause analysis
    - [ ] Style with Linear design tokens

## Phase 3: Optimize View

- [ ] Task: Build optimize view
    - [ ] Create `frontend/src/pages/OptimizePage.tsx`
    - [ ] Add A/B test display
    - [ ] Add create A/B test form
    - [ ] Add policy parameters
    - [ ] Style with Linear design tokens

## Phase 4: A/B Testing Engine

- [ ] Task: Create A/B testing logic
    - [ ] Create `pivot/src/optimization/abTest.ts`
    - [ ] Implement test creation
    - [ ] Add traffic splitting
    - [ ] Track results per group
    - [ ] Calculate statistical significance

## Phase 5: Reconciliation Engine

- [ ] Task: Create reconciliation logic
    - [ ] Create `pivot/src/diagnostics/reconcile.ts`
    - [ ] Detect system issues
    - [ ] Generate fix proposals
    - [ ] Apply approved fixes
    - [ ] Log reconciliation actions

## Phase 6: Audit Trail

- [ ] Task: Create audit trail
    - [ ] Create `pivot/src/diagnostics/audit.ts`
    - [ ] Log all pipeline events
    - [ ] Add filtering by agent, time, type
    - [ ] Enable search
    - [ ] Store in Convex

## Phase 7: Data Integration

- [ ] Task: Wire operations to Convex
    - [ ] Add `useQuery` for system status
    - [ ] Add `useMutation` for A/B tests
    - [ ] Add `useMutation` for reconciliation
    - [ ] Implement realtime updates

## Phase 8: Real-time Updates

- [ ] Task: Add real-time data
    - [ ] Use Convex subscriptions
    - [ ] Update charts in real-time
    - [ ] Show live agent status
    - [ ] Update queue depth live

## Phase 9: Policy Parameters

- [ ] Task: Build policy tuning UI
    - [ ] Create policy parameter components
    - [ ] Add save/load functionality
    - [ ] Validate parameter ranges
    - [ ] Test parameter changes

## Phase 10: Testing

- [ ] Task: Write tests
    - [ ] Unit tests for A/B testing
    - [ ] Unit tests for reconciliation
    - [ ] Integration tests for monitor
    - [ ] Test real-time updates
