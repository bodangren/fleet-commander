# Specification: Schema & Resilience

## Overview

Address schema evolution risk and single points of failure identified in the 2026-05-01 architecture review. Add schema version tracking, implement retry logic for Convex operations, and create a health check endpoint. This is prerequisite for safe production deployment.

## Functional Requirements

### 1. Schema Version Tracking

- Create `systemMetadata` table to track schema version
- Add schema version field (integer, monotonically increasing)
- Write migration to populate initial version (v1)
- Check schema version on server startup and warn if outdated
- Document schema migration strategy in ADR

### 2. Convex Retry Logic

- Implement exponential backoff with jitter for Convex mutations
- Add retry wrapper for orchestrator client calls
- Configurable max retries and backoff parameters via settings
- Distinguish between retryable (network) and non-retryable (validation) errors
- Add tests verifying retry behavior

### 3. Health Check Endpoint

- Create `/health` endpoint in Bun server
- Verify Convex connectivity (query a simple endpoint)
- Report queue depth (pending tasks count)
- Report last successful dispatch timestamp
- Return 503 Service Unavailable if Convex unreachable
- Include circuit breaker status per agent

### 4. Schema Migration Strategy

- Document widen-migrate-narrow workflow
- Add schema version checks to migrations
- Ensure backward compatibility during transitions
- Add validation that schema changes are accompanied by version bump

## Non-Functional Requirements

- Retry logic must not cause cascading failures
- Health check must be lightweight (< 100ms)
- Schema version checks must not block startup
- All changes backward compatible with existing data

## Acceptance Criteria

- [ ] `systemMetadata` table exists with schema version
- [ ] Server checks schema version on startup
- [ ] Convex mutations retry with exponential backoff
- [ ] `/health` endpoint returns 200 with system status
- [ ] `/health` returns 503 when Convex unavailable
- [ ] Health response includes queue depth and last dispatch time
- [ ] Retry behavior tested with simulated failures
- [ ] Schema migration strategy documented

## Out of Scope

- Full offline mode with SQLite write-back (deferred to resilience track)
- Automatic schema migrations (manual for now)
- Database sharding or partitioning
