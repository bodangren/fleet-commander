# Implementation Plan: Observability Stack

## Phase 1: Structured Logging Rollout

- [x] Task: Create structured logger
    - [x] `logger.ts` already has `logOrchestratorError` with severity levels and Convex persistence.
    - [x] `logAndCaptureError` logs to both console and Convex.
    - [x] Standard fields: severity, operation, projectSlug, taskKey, agentId, message.

- [~] Task: Replace console calls in pivot
    - [x] Request logging middleware added to `server.ts` — logs method, path, status, duration.
    - [x] Skips health endpoints to reduce noise.
    - [x] Slow requests (>5s) logged at warn level.
    - [ ] Remaining bare `console.*` calls in orchestrator/policy (82 instances) — deferred.

## Phase 2: Alerts Table

- [x] Task: Create alerts schema
    - [x] Added `alerts` table to Convex schema with type, severity, message, context, resolved fields.
    - [x] Types: circuit_open, stall_detected, budget_breach, schema_drift, health_check_failed.
    - [x] Indexes: by_type, by_severity, by_resolved, by_created_at.

- [x] Task: Add alert operations
    - [x] `createAlert` mutation with deduplication (same type+message unresolved = skip).
    - [x] `resolveAlert` mutation.
    - [x] `listActiveAlerts` query.

- [ ] Task: Auto-create alerts
    - [ ] Wire into circuit breaker open state — deferred.
    - [ ] Wire into stalled detector — deferred.

## Phase 3: Enhanced Health Endpoint

- [x] Task: Extend /health response
    - [x] `/api/orchestrator/health` returns: circuit breakers, stalled tasks, active executions, schema version.
    - [x] Returns 503 on Convex failure.
    - [ ] Queue depth metrics, health score — deferred.

## Phase 4: Request Logging

- [x] Task: Add request logging middleware
    - [x] Logs all HTTP requests (method, path, status, duration).
    - [x] Skips health endpoints.
    - [x] Slow requests (>5s) at warn level.

## Phase 5: Final Verification

- [x] Task: Run tests and verify
    - [x] All pivot tests pass (706 pass).
    - [x] Health endpoint returns complete data.
    - [x] Alerts table exists with CRUD operations.
