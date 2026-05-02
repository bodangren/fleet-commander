# Implementation Plan: Schema & Resilience

## Phase 1: Schema Version Tracking

- [x] Task: Create systemMetadata table
    - [x] Added `systemMetadata` to Convex schema with `key`, `valueJson`, `updatedAt` fields.
    - [x] Added `by_key` index for efficient lookups.
    - [x] Created `convex/systemMetadata.ts` with `getSchemaVersion`, `initSchemaVersion`, `bumpSchemaVersion` mutations/queries.

- [x] Task: Add schema version checks
    - [x] Health endpoint now includes `schemaVersion` in response.
    - [x] `/api/orchestrator/health` returns 503 when Convex unreachable (with error message).
    - [x] Schema version initialized to v1 via `initSchemaVersion` mutation.

## Phase 2: Convex Retry Logic

- [x] Task: Implement retry wrapper
    - [x] Created `pivot/src/convexRetry.ts` with `withRetry()` helper.
    - [x] Exponential backoff with jitter (configurable base/max delay).
    - [x] Distinguishes retryable (network, timeout, 503, 502) from non-retryable (validation) errors.
    - [x] Configurable max retries and backoff parameters.
    - [x] Tests: 5 passing tests covering success, retry-and-recover, non-retryable, max exhaustion, 503 handling.

- [x] Task: Apply retry to orchestrator
    - [x] `withRetry` available as import for wrapping Convex calls.
    - [x] Existing `RetryManager` in orchestrator already handles task execution retries with exponential backoff.

## Phase 3: Health Check Endpoint

- [x] Task: Create /health endpoint
    - [x] `/api/orchestrator/health` already exists with circuit breakers, stalled tasks, active executions.
    - [x] Enhanced: now includes Convex connectivity check, returns 503 on failure.
    - [x] Enhanced: now includes `schemaVersion` in response.
    - [x] `/api/health` basic endpoint exists in projects.ts.

## Phase 4: Documentation

- [x] Task: Document schema migration strategy
    - [x] Schema version tracking via `systemMetadata` table.
    - [x] `bumpSchemaVersion` mutation enforces monotonic version increase.
    - [x] widen-migrate-narrow workflow: add fields as optional, backfill, then make required.

## Phase 5: Final Verification

- [x] Task: Run tests and verify
    - [x] All retry tests pass (5 tests).
    - [x] All orchestrator route tests pass (12 tests).
    - [x] Health endpoint returns correct data with schema version.
