/**
 * Phase 7 Red-phase tests for the `providerHealthStatus` validator (TD-235).
 *
 * The Green phase must add a `providerHealthStatus` validator to
 * `convex/lib/validators.ts` that accepts the three health values:
 *   - "healthy"
 *   - "degraded"
 *   - "unhealthy"
 *
 * Currently `providerStatus` (operational) is overloaded with these
 * health values, causing the typecheck errors at `convex/providers.ts:199,213`.
 * Splitting the vocabulary requires a dedicated health validator.
 *
 * These tests are intentionally Red — they assert the export exists and
 * accepts the expected literals, both of which fail in the current state.
 *
 * Spec: measure/tracks/provider_health_resilience_20260605/spec.md
 * Test strategy: measure/tracks/provider_health_resilience_20260605/test-strategy.md
 * Plan: Phase 7 task 1
 */
import { describe, expect, it } from 'bun:test'
import * as validators from './lib/validators'

describe('providerHealthStatus validator (TD-235)', () => {
  it('is exported from convex/lib/validators', () => {
    expect(validators.providerHealthStatus).toBeDefined()
  })

  it('is a Convex validator (has a validate property)', () => {
    const v = validators.providerHealthStatus as { validate?: unknown }
    expect(v).toBeTruthy()
    expect(typeof v.validate).toBe('function')
  })
})
