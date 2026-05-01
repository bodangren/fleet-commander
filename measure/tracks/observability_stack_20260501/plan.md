# Implementation Plan: Observability Stack

## Phase 1: Structured Logging Rollout

- [ ] Task: Create structured logger
    - [ ] Implement logger with levels: fatal, error, warn, info, debug
    - [ ] Add JSON output format for production
    - [ ] Include standard fields: timestamp, level, service, operation
    - [ ] Add request ID propagation

- [ ] Task: Replace console calls in pivot
    - [ ] Replace all `console.log` in routes
    - [ ] Replace all `console.warn` in orchestrator
    - [ ] Replace all `console.error` in policy
    - [ ] Keep console for startup messages only
    - [ ] Write tests for logger behavior

## Phase 2: Alerts Table

- [ ] Task: Create alerts schema
    - [ ] Add `alerts` table to Convex schema
    - [ ] Types: circuit_open, stall_detected, budget_breach, schema_drift, health_check_failed
    - [ ] Add severity field (critical, warning, info)
    - [ ] Add resolvedAt field

- [ ] Task: Add alert operations
    - [ ] Create `createAlert` mutation
    - [ ] Create `resolveAlert` mutation
    - [ ] Create `listActiveAlerts` query
    - [ ] Add deduplication logic
    - [ ] Write tests for alert creation

- [ ] Task: Auto-create alerts
    - [ ] Create alert when circuit breaker opens
    - [ ] Create alert when task stalls
    - [ ] Create alert on budget breach
    - [ ] Log alert creation

## Phase 3: Enhanced Health Endpoint

- [ ] Task: Extend /health response
    - [ ] Add circuit breaker status per agent
    - [ ] Add recent error count (last hour)
    - [ ] Add queue depth metrics
    - [ ] Add last successful dispatch timestamp
    - [ ] Add version info (git commit, schema version)
    - [ ] Return health score (0-100)

- [ ] Task: Frontend health display
    - [ ] Fetch health status periodically
    - [ ] Show system status in ops page
    - [ ] Show alert badge for active alerts

## Phase 4: Request Logging

- [ ] Task: Add request logging middleware
    - [ ] Log all HTTP requests (method, path, status, duration)
    - [ ] Include requestId in response headers
    - [ ] Skip health check to reduce noise
    - [ ] Log slow requests at warn level

## Phase 5: Final Verification

- [ ] Task: Run tests and verify
    - [ ] Run all pivot tests
    - [ ] Run all frontend tests
    - [ ] Verify no bare console calls remain
    - [ ] Test alert creation and resolution
    - [ ] Verify health endpoint returns complete data
