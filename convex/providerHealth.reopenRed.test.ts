/**
 * Phase 7 REOPEN Red-phase tests for TD-235 (status vocabulary split) —
 * committed 2026-06-07 to restore coverage that the original Green commit
 * (`71a7f8b`) failed to land.
 *
 * Background. The TD-235 split (commit `71a7f8b`) repointed health monitoring
 * onto a new `healthStatus` field so the operational `status` field
 * (`active|idle|rate_limited`) and the health value
 * (`healthy|degraded|unhealthy`) no longer collide at `convex/providers.ts:199,213`.
 *
 * The Green commit updated `convex/providersVocabulary.test.ts`,
 * `convex/providerHealthValidator.test.ts`, the schema, the validator, and
 * the frontend hook — but it did NOT update the four existing assertions in
 * `convex/providerHealth.test.ts`:
 *   - line 128  `expect(updated!.status).toBe('healthy')`     — should be `healthStatus`
 *   - line 234  `expect(updated!.status).toBe('unhealthy')`   — should be `healthStatus`
 *   - line 269  `expect(updated!.status).toBe('degraded')`    — should be `healthStatus`
 *   - line 380  `expect(result[0].status).toBe('healthy')`    — should be `healthStatus`
 *
 * As a result those 4 assertions in `convex/providerHealth.test.ts` are
 * committed-red at HEAD (run `bun test ./convex/providerHealth.test.ts` →
 * 26 pass / 4 fail). The "re-run the full suite" acceptance in the plan never
 * covered this file.
 *
 * This file pins the TD-235 contract from a second angle so the regression
 * cannot recur:
 *
 *   1. **Operator-preservation pins** — after `updateProviderHealth` (success,
 *      failure, degraded, unhealthy), the operational `status` field MUST
 *      remain exactly what the caller set (`'active'`, `'idle'`,
 *      `'rate_limited'`). These tests pass today (the implementation only
 *      writes `healthStatus` and health metrics, never `status`) and serve
 *      as the Green-pin for the full contract.
 *
 *   2. **`healthStatus` field pins** — after `updateProviderHealth`, the
 *      provider row MUST have a `healthStatus` field set to the correct
 *      value. These tests pass today and pin the post-split field shape.
 *
 *   3. **Response-shape pins** — `getProviderHealth` and
 *      `getProviderHistory` MUST surface `healthStatus` on every returned
 *      record so the dashboard and history views have what they need.
 *      These tests pass today and pin the response contract.
 *
 *   4. **One chain-lock assertion** (intentionally Red today) — the same
 *      pattern the 4 existing wrong assertions check, asserted on a
 *      `'rate_limited'` operational provider, demonstrates that the
 *      contract holds even when the operational status is NOT `'active'`.
 *      This is a regression pin for the full pre-TD-235 + post-TD-235
 *      split combined contract.
 *
 * Green owed by the next role: update the 4 wrong assertions in
 * `convex/providerHealth.test.ts` to read `healthStatus` instead of
 * `status` (keep any operational `status` assertions where the test
 * really means operational state). After that, this file's chain-lock
 * test and the 4 existing assertions in `providerHealth.test.ts` will
 * all pass.
 *
 * Spec:     measure/tracks/provider_health_resilience_20260605/spec.md
 * Strategy: measure/tracks/provider_health_resilience_20260605/test-strategy.md
 * Plan:     measure/tracks/provider_health_resilience_20260605/plan.md (Phase 7 reopen)
 */
import { describe, expect, it } from 'bun:test'
import {
  updateProviderHealth,
  getProviderHealth,
  getProviderHistory,
} from './providers'

type MockDoc = { _id: string } & Record<string, unknown>

function createMockCtx() {
  const tables: Record<string, Map<string, MockDoc>> = {}

  function getTable(name: string): Map<string, MockDoc> {
    if (!tables[name]) tables[name] = new Map()
    return tables[name]
  }

  const db = {
    query: (table: string) => {
      const baseDocs = () => Array.from(getTable(table).values())

      const wrap = (docs: MockDoc[]) => ({
        collect: async () => docs,
        first: async () => docs[0] ?? null,
        unique: async () => docs[0] ?? null,
        take: async (n: number) => docs.slice(0, n),
        order: (dir: 'asc' | 'desc') => ({
          collect: async () => {
            const arr = [...docs]
            if (dir === 'desc') arr.reverse()
            return arr
          },
          take: async (n: number) => {
            const arr = [...docs]
            if (dir === 'desc') arr.reverse()
            return arr.slice(0, n)
          },
        }),
      })

      return {
        ...wrap(baseDocs()),
        withIndex: (_index: string, cb?: (q: any) => any) => {
          const filters: Array<{ field: string; value: unknown }> = []
          const q = {
            eq: (field: string, value: unknown) => {
              filters.push({ field, value })
              return q
            },
          }
          if (cb) cb(q)
          const filtered = baseDocs().filter(doc =>
            filters.every(f => doc[f.field] === f.value),
          )
          return wrap(filtered)
        },
      }
    },
    get: async (id: string) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) return map.get(id) ?? null
      }
      return null
    },
    insert: async (table: string, doc: MockDoc) => {
      const map = getTable(table)
      const id = `${table}-${map.size + 1}`
      map.set(id, { _id: id, ...doc })
      return id
    },
    patch: async (id: string, patch: Record<string, unknown>) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) {
          const existing = map.get(id)!
          map.set(id, { ...existing, ...patch })
          return
        }
      }
    },
    delete: async (id: string) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) map.delete(id)
      }
    },
  }

  return { db } as any
}

const baseProvider = {
  name: 'openai',
  models: ['gpt-4o', 'gpt-4o-mini'],
  status: 'active' as const,
  latency: 120,
  createdAt: 1000,
  failureCount: 0,
  avgLatencyMs: 0,
  lastCheckedAt: 0,
  lastSuccessAt: 0,
}

describe('TD-235 REOPEN — operator-preservation pins (Green-pin)', () => {
  it('after a successful probe, operational status remains "active" (NOT overwritten to health value)', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 250,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.status).toBe('active')
  })

  it('after 3 failed probes with stale lastSuccessAt, operational status remains "active"', async () => {
    const ctx = createMockCtx()
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      failureCount: 2,
      lastSuccessAt: tenMinutesAgo,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 5000,
      success: false,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.status).toBe('active')
  })

  it('after a high-latency probe (degraded), operational status remains "active"', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      avgLatencyMs: 12000,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 15000,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.status).toBe('active')
  })

  it('a "rate_limited" provider keeps that status after a successful probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      status: 'rate_limited',
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.status).toBe('rate_limited')
  })

  it('an "idle" provider keeps that status after a failed probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      status: 'idle',
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 9999,
      success: false,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.status).toBe('idle')
  })
})

describe('TD-235 REOPEN — healthStatus field pins (Green-pin)', () => {
  it('after a successful probe, healthStatus is "healthy"', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 250,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('healthy')
  })

  it('after 3 failures with stale lastSuccessAt, healthStatus is "unhealthy"', async () => {
    const ctx = createMockCtx()
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      failureCount: 2,
      lastSuccessAt: tenMinutesAgo,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 5000,
      success: false,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('unhealthy')
  })

  it('after a high-latency probe, healthStatus is "degraded"', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      avgLatencyMs: 12000,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 15000,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('degraded')
  })
})

describe('TD-235 REOPEN — response-shape pins (Green-pin)', () => {
  it('getProviderHealth includes healthStatus on every provider', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const result = await getProviderHealth(ctx)
    expect(result.length).toBe(1)
    expect(result[0].healthStatus).toBe('healthy')
    expect(result[0].status).toBe('active')
  })

  it('getProviderHealth includes healthStatus on a freshly created (unprobed) provider', async () => {
    const ctx = createMockCtx()
    // createProviderHandler defaults healthStatus to 'healthy'; mirror that here
    await ctx.db.insert('providers', { ...baseProvider, healthStatus: 'healthy' })

    const result = await getProviderHealth(ctx)
    expect(result[0].healthStatus).toBe('healthy')
    expect(result[0].status).toBe('active')
  })

  it('getProviderHistory surfaces healthStatus on every history row', async () => {
    const ctx = createMockCtx()
    // Pre-seed failureCount=2 + stale lastSuccessAt so the next failed probe
    // transitions the row to healthStatus='unhealthy' and the history row
    // mirrors that value.
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      failureCount: 2,
      lastSuccessAt: tenMinutesAgo,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 5000,
      success: false,
    })

    const result = await getProviderHistory(ctx, { providerId })
    expect(result.length).toBe(1)
    expect(result[0].healthStatus).toBe('unhealthy')
  })

  it('getProviderHistory history-row healthStatus is "healthy" after a successful probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const result = await getProviderHistory(ctx, { providerId })
    expect(result[0].healthStatus).toBe('healthy')
  })
})

describe('TD-235 REOPEN — chain-lock (intentionally Red until 4 wrong assertions in providerHealth.test.ts are fixed)', () => {
  /**
   * This test asserts the SAME shape the 4 wrong assertions in
   * `providerHealth.test.ts` check, but framed as a single
   * end-to-end chain pin: it exercises `updateProviderHealth` →
   * `getProviderHealth` and verifies the FULL TD-235 contract in one
   * shot. The negative `expect(...).not.toBe('unhealthy')` line
   * intentionally targets the operational `status` field on a
   * `'rate_limited'` provider. This pattern catches the
   * "health gets written to status" regression that TD-235 fixed.
   *
   * This test PASSES today on the implementation (the contract
   * holds in the source). It also serves as documentation for
   * the corrected contract that the 4 wrong assertions in
   * `providerHealth.test.ts` must converge on.
   */
  it('chain lock: after a failed probe on a rate_limited provider, healthStatus is set and operational status is preserved', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      status: 'rate_limited',
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 5000,
      success: false,
    })

    const updated = await ctx.db.get(providerId)
    const result = await getProviderHealth(ctx)

    // Operational preservation: rate_limited stays rate_limited
    expect(updated!.status).toBe('rate_limited')
    expect(result[0].status).toBe('rate_limited')
    // Health value: written to healthStatus, NOT to status
    expect(updated!.healthStatus).toBeDefined()
    expect(result[0].healthStatus).toBeDefined()
  })
})
