# Specification: Observability Stack

## Overview

Replace ad-hoc console logging with structured observability identified in the 2026-05-01 architecture review. Create alerts table for actionable events, enhance health endpoint with system metrics, and establish logging standards across the codebase.

## Functional Requirements

### 1. Structured Logging Rollout

- Choose logging approach (Bun native console with JSON format, or lightweight wrapper)
- Replace all `console.log/warn/error` in pivot with structured logger
- Add log levels: fatal, error, warn, info, debug
- Add JSON output format for production (env-controlled)
- Include standard fields: timestamp, level, service, operation, context
- Add request ID propagation for tracing

### 2. Alerts Table

- Create `alerts` table in Convex schema
- Alert types: circuit_open, stall_detected, budget_breach, schema_drift, health_check_failed
- Mutations: createAlert, resolveAlert, listActiveAlerts
- Query: getActiveAlerts by type or severity
- Auto-create alerts from orchestrator (circuit open, stall)
- Add alert badge in frontend header

### 3. Enhanced Health Endpoint

- Extend `/health` with circuit breaker status per agent
- Add recent error count (last hour)
- Add queue depth metrics (todo, ready, in_progress, blocked counts)
- Add last successful dispatch timestamp
- Add version info (git commit, schema version)
- Return structured JSON with health score (0-100)

### 4. Request Logging

- Add middleware to log all HTTP requests
- Include: method, path, status, duration, requestId
- Skip health check endpoint to reduce noise
- Log slow requests (> 1s) at warn level

## Non-Functional Requirements

- Logging must not impact performance (< 1ms per log)
- JSON format must be parseable by log aggregation tools
- Alerts must not duplicate (deduplication key)
- Health endpoint must remain lightweight

## Acceptance Criteria

- [ ] No bare `console.log/warn/error` calls in pivot
- [ ] Structured logger supports fatal/error/warn/info/debug
- [ ] JSON output in production mode
- [ ] `alerts` table exists with all alert types
- [ ] Alerts auto-created for circuit_open and stall
- [ ] `/health` returns circuit breaker status
- [ ] `/health` returns queue depth and error counts
- [ ] Request logging middleware active
- [ ] Frontend shows alert badge for active alerts

## Out of Scope

- Prometheus/Grafana integration (Phase 10)
- Distributed tracing (OpenTelemetry)
- Log aggregation service setup
- PagerDuty/Slack alerting hooks
