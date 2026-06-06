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

  it('is a Convex validator (isConvexValidator=true)', () => {
    const v = validators.providerHealthStatus as { isConvexValidator?: unknown }
    expect(v).toBeTruthy()
    expect(v.isConvexValidator).toBe(true)
  })

  it('is a union validator with three literal members', () => {
    const v = validators.providerHealthStatus as {
      kind?: string
      members?: Array<{ kind?: string; value?: string }>
    }
    expect(v.kind).toBe('union')
    const literals = (v.members ?? [])
      .map((m) => m.value)
      .filter((x): x is string => typeof x === 'string')
      .sort()
    expect(literals).toEqual(['degraded', 'healthy', 'unhealthy'])
  })
})
