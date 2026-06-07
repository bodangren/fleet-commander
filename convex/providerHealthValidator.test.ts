/**
 * Phase 7 tests for the `providerHealthStatus` validator (TD-235).
 *
 * Validates that `convex/lib/validators.ts` exports a `providerHealthStatus`
 * union validator accepting the three health values:
 *   - "healthy"
 *   - "degraded"
 *   - "unhealthy"
 *
 * Green since commit `71a7f8b`: the validator was added alongside the
 * `healthStatus` field on the providers schema, resolving the typecheck
 * errors at `convex/providers.ts:199,213` where operational `status`
 * (`active|idle|rate_limited`) was overloaded with health values.
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
