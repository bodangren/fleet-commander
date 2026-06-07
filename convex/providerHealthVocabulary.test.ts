/**
 * Phase 7 Red-phase tests for TD-235 (status vocabulary split).
 *
 * These tests assert the contract for the fix that adds a separate
 * `healthStatus` field to provider documents, decoupled from the operational
 * `status` field. Currently both fields write to the same `status` column,
 * causing typecheck errors at `convex/providers.ts:199,213` and silent
 * overwrites between `createProvider`/`updateProviderStatusHandler` and
 * `updateProviderHealth`.
 *
 * The tests will fail until the green phase:
 *   - Adds a `providerHealthStatus` validator and `healthStatus` field to
 *     `convex/schema/agents.ts` providers + providerHealthHistory tables
 *   - Repoints `updateProviderHealth` to write `healthStatus` (and the history
 *     row's `status` becomes `healthStatus`)
 *   - Extends `providerResponse` validator with `healthStatus`
 *   - Adds a `backfillProviderHealthStatus` mutation that defaults missing
 *     values to `healthy`
 *
 * Spec: measure/tracks/provider_health_resilience_20260605/spec.md
 * Test strategy: measure/tracks/provider_health_resilience_20260605/test-strategy.md
 * Plan: Phase 7 task 1 + task 2
 */
import { describe, expect, it } from 'bun:test'
import {
  updateProviderHealth,
  getProviderHealth,
  getProviderHistory,
  backfillProviderHealthStatus,
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

// ---------------------------------------------------------------------------
// updateProviderHealth writes to healthStatus, not status (TD-235)
// ---------------------------------------------------------------------------

describe('updateProviderHealth writes to healthStatus (TD-235)', () => {
  it('writes the computed health value to healthStatus, not status', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('healthy')
  })

  it('preserves the operational status field (does not overwrite with health value)', async () => {
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
    expect(updated!.healthStatus).toBe('healthy')
  })

  it('writes the transition-to-unhealthy value to healthStatus, not status', async () => {
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
    expect(updated!.status).toBe('active')
  })

  it('writes the transition-to-degraded value to healthStatus, not status', async () => {
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
    expect(updated!.status).toBe('active')
  })
})

// ---------------------------------------------------------------------------
// getProviderHealth return shape includes healthStatus (TD-235)
// ---------------------------------------------------------------------------

describe('getProviderHealth returns healthStatus (TD-235)', () => {
  it('returns healthStatus populated by a successful probe', async () => {
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
  })

  it('keeps operational status and healthStatus on separate fields in the return shape', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      status: 'idle',
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const result = await getProviderHealth(ctx)
    expect(result[0].status).toBe('idle')
    expect(result[0].healthStatus).toBe('healthy')
  })
})

// ---------------------------------------------------------------------------
// getProviderHistory return shape includes healthStatus (TD-235)
// ---------------------------------------------------------------------------

describe('getProviderHistory returns healthStatus per row (TD-235)', () => {
  it('persists healthStatus on every history row', async () => {
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

  it('records a transition to unhealthy in the healthStatus of the history row', async () => {
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

    const result = await getProviderHistory(ctx, { providerId })
    expect(result[0].healthStatus).toBe('unhealthy')
  })
})

// ---------------------------------------------------------------------------
// backfillProviderHealthStatus migration (TD-235)
// ---------------------------------------------------------------------------

describe('backfillProviderHealthStatus (TD-235)', () => {
  it('is exported from convex/providers', () => {
    expect(backfillProviderHealthStatus).toBeDefined()
  })

  it('sets healthStatus=healthy for providers missing it', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
    })

    await backfillProviderHealthStatus(ctx, {})

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('healthy')
  })

  it('does not overwrite an existing healthStatus value', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      healthStatus: 'degraded',
    })

    await backfillProviderHealthStatus(ctx, {})

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('degraded')
  })

  it('backfills from the most recent probe status before defaulting to healthy', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await ctx.db.insert('providerHealthHistory', {
      providerId,
      providerName: 'openai',
      latencyMs: 200,
      success: true,
      status: 'degraded',
      checkedAt: 1000,
    })
    await ctx.db.insert('providerHealthHistory', {
      providerId,
      providerName: 'openai',
      latencyMs: 5000,
      success: false,
      status: 'unhealthy',
      checkedAt: 2000,
    })

    await backfillProviderHealthStatus(ctx, {})

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('unhealthy')
  })

  it('preserves the operational status field during backfill', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      status: 'rate_limited',
    })

    await backfillProviderHealthStatus(ctx, {})

    const updated = await ctx.db.get(providerId)
    expect(updated!.status).toBe('rate_limited')
    expect(updated!.healthStatus).toBe('healthy')
  })

  it('is idempotent: running twice produces the same healthStatus value', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })

    await backfillProviderHealthStatus(ctx, {})
    await backfillProviderHealthStatus(ctx, {})

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('healthy')
  })

  it('backfills only providers missing the field when others already have it', async () => {
    const ctx = createMockCtx()
    const missing = await ctx.db.insert('providers', { ...baseProvider })
    const present = await ctx.db.insert('providers', {
      ...baseProvider,
      name: 'anthropic',
      healthStatus: 'unhealthy',
    })

    await backfillProviderHealthStatus(ctx, {})

    const afterMissing = await ctx.db.get(missing)
    const afterPresent = await ctx.db.get(present)
    expect(afterMissing!.healthStatus).toBe('healthy')
    expect(afterPresent!.healthStatus).toBe('unhealthy')
  })

  it('returns the count of providers backfilled', async () => {
    const ctx = createMockCtx()
    await ctx.db.insert('providers', { ...baseProvider })
    await ctx.db.insert('providers', { ...baseProvider, name: 'anthropic' })
    await ctx.db.insert('providers', {
      ...baseProvider,
      name: 'google',
      healthStatus: 'degraded',
    })

    const result = await backfillProviderHealthStatus(ctx, {})
    expect(result.backfilledCount).toBe(2)
  })
})
