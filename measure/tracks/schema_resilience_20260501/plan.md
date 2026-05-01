# Implementation Plan: Schema & Resilience

## Phase 1: Schema Version Tracking

- [ ] Task: Create systemMetadata table
    - [ ] Add `systemMetadata` to Convex schema
    - [ ] Add schemaVersion field (integer)
    - [ ] Add lastUpdated timestamp
    - [ ] Write migration to populate initial version (v1)

- [ ] Task: Add schema version checks
    - [ ] Check schema version on server startup
    - [ ] Log warning if version mismatch detected
    - [ ] Add `/api/schema/version` endpoint
    - [ ] Write tests for version check logic

## Phase 2: Convex Retry Logic

- [ ] Task: Implement retry wrapper
    - [ ] Create `withRetry()` helper with exponential backoff
    - [ ] Add jitter to prevent thundering herd
    - [ ] Distinguish retryable vs non-retryable errors
    - [ ] Add config for max retries and backoff parameters

- [ ] Task: Apply retry to orchestrator
    - [ ] Wrap Convex mutations in retry logic
    - [ ] Add retry to critical paths (task updates, logging)
    - [ ] Log retry attempts for observability
    - [ ] Write tests for retry behavior

## Phase 3: Health Check Endpoint

- [ ] Task: Create /health endpoint
    - [ ] Verify Convex connectivity with lightweight query
    - [ ] Report queue depth (pending tasks count)
    - [ ] Report last successful dispatch timestamp
    - [ ] Return 503 if Convex unavailable

- [ ] Task: Enhance health response
    - [ ] Add circuit breaker status per agent
    - [ ] Add recent error count (last hour)
    - [ ] Add version info (git commit, schema version)
    - [ ] Return health score (0-100)
    - [ ] Write tests for health endpoint

## Phase 4: Documentation

- [ ] Task: Document schema migration strategy
    - [ ] Add ADR for schema versioning approach
    - [ ] Document widen-migrate-narrow workflow
    - [ ] Add developer guide for schema changes

## Phase 5: Final Verification

- [ ] Task: Run tests and verify
    - [ ] Run all pivot tests
    - [ ] Run type checks
    - [ ] Verify health endpoint returns correct data
    - [ ] Test retry behavior with simulated failures
