/**
 * Phase 3 Red-phase contract test for status_vocabulary_unification_20260605
 * (TD-235). Pins the acceptance criterion from spec.md:
 *
 *   "providers.status overload resolved via a separate healthStatus field
 *    (closes TD-235); operational status semantics preserved; data migrated."
 *
 * This test is the single source of truth for the Phase 3 contract. It
 * imports the canonical exports and asserts the inventory.md §1 and §7
 * "already done" claims are still true. If this test passes, TD-235 stays
 * resolved; if it ever fails, the contract has regressed and the inventory
 * needs a touch-up.
 *
 * Backed by the implementation committed in 71a7f8b (under the
 * provider_health_resilience track). The test is independent of that commit
 * to avoid import-order drift.
 *
 * Spec:       measure/tracks/status_vocabulary_unification_20260605/spec.md
 * Test-strategy: §3 (Phase 3 row), §5 (Phase 3 row)
 * Plan:       Phase 3 — Resolve providers.status Overload (TD-235)
 */
import { describe, expect, it } from 'bun:test'
import * as validators from './lib/validators'
import { providerHealthStatus, providerStatus, providerHealthStatusDisplay } from './lib/validators'

type ConvexValidator = { isConvexValidator?: boolean; kind?: string; members?: unknown[] }

// ---------------------------------------------------------------------------
// Task 1: providerHealthStatus validator + healthStatus field exist
// ---------------------------------------------------------------------------

describe('Phase 3 / TD-235: providerHealthStatus validator exists', () => {
  it('is exported from convex/lib/validators', () => {
    expect(validators.providerHealthStatus).toBeDefined()
  })

  it('is a Convex union validator (isConvexValidator=true, kind=union)', () => {
    const v = providerHealthStatus as unknown as ConvexValidator
    expect(v.isConvexValidator).toBe(true)
    expect(v.kind).toBe('union')
  })

  it('accepts exactly the three documented health literals', () => {
    const v = providerHealthStatus as unknown as ConvexValidator
    const literals = (v.members ?? [])
      .map((m) => (m as { value?: string }).value)
      .filter((x): x is string => typeof x === 'string')
      .sort()
    expect(literals).toEqual(['degraded', 'healthy', 'unhealthy'])
  })

  it('exposes a derived TS type ProviderHealthStatus', () => {
    // Type-level assertion: ProviderHealthStatus is exported as a type alias.
    // The test-strategy requires one derived type per vocabulary.
    type _Check = validators.ProviderHealthStatus
    const _compileGuard: _Check = 'healthy' as _Check
    expect(_compileGuard).toBe('healthy')
  })
})

// ---------------------------------------------------------------------------
// Task 1: providerStatus (operational) stays separate — not overloaded
// ---------------------------------------------------------------------------

describe('Phase 3 / TD-235: providerStatus (operational) stays distinct', () => {
  it('does NOT accept the health literals (no overload)', () => {
    const v = providerStatus as unknown as ConvexValidator
    const literals = (v.members ?? [])
      .map((m) => (m as { value?: string }).value)
      .filter((x): x is string => typeof x === 'string')
      .sort()
    // Operational vocabulary is {active, idle, rate_limited} — health values
    // must NOT be in here. This is the contract that was broken before TD-235.
    expect(literals).toEqual(['active', 'idle', 'rate_limited'])
  })

  it('disjoint from providerHealthStatus (the split is real)', () => {
    const opV = providerStatus as unknown as ConvexValidator
    const heV = providerHealthStatus as unknown as ConvexValidator
    const opLiterals = new Set(
      (opV.members ?? [])
        .map((m) => (m as { value?: string }).value)
        .filter((x): x is string => typeof x === 'string'),
    )
    const heLiterals = new Set(
      (heV.members ?? [])
        .map((m) => (m as { value?: string }).value)
        .filter((x): x is string => typeof x === 'string'),
    )
    for (const lit of heLiterals) {
      expect(opLiterals.has(lit)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// Display-map parity (test-strategy §3: parity test must cover every
// validator → every map that consumes it)
// ---------------------------------------------------------------------------

describe('Phase 3 / TD-235: providerHealthStatusDisplay map parity', () => {
  it('is exported from convex/lib/validators', () => {
    expect(validators.providerHealthStatusDisplay).toBeDefined()
  })

  it('keys match the providerHealthStatus literal set exactly', () => {
    const v = providerHealthStatus as unknown as ConvexValidator
    const literals = (v.members ?? [])
      .map((m) => (m as { value?: string }).value)
      .filter((x): x is string => typeof x === 'string')
      .sort()
    const mapKeys = Object.keys(providerHealthStatusDisplay).sort()
    expect(mapKeys).toEqual(literals)
  })
})
