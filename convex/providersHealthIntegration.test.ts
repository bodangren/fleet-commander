/**
 * Phase 3 / TD-235 integration contract: updateProviderHealth writes
 * healthStatus; getProviderHealth returns both fields.
 *
 * Per test-strategy §5 (Phase 3 row): "add convex/providers.test.ts cases
 * for updateProviderHealth writing healthStatus and getProviderHealth
 * returning both fields."
 *
 * These cases live in a separate file (rather than extending
 * providers.test.ts) because they pull in a different fixture scope (a
 * minimal MockCtx that supports the withIndex chain used by getProviderHistory)
 * and they pin the TD-235 contract that the backfill and vocabulary tests
 * already exercise in isolation. The three files form a layered contract:
 *
 *   - statusVocabPhase3Contract.test.ts → validator + schema + display map
 *   - providersBackfill.test.ts        → migration idempotency
 *   - providersHealthIntegration.test.ts → handler read+write (this file)
 *
 * Spec:       measure/tracks/status_vocabulary_unification_20260605/spec.md
 * Test-strategy: §3 (Phase 3 → getProviderHealth return shape), §5 (Phase 3 row)
 * Plan:       Phase 3 Task 2 — Repoint updateProviderHealth; getProviderHealth
 */
import { describe, expect, it } from 'bun:test'
import {
  updateProviderHealth,
  getProviderHealth,
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
        take: async (n: number) => docs.slice(0, n),
        order: (dir: 'asc' | 'desc') => ({
          collect: async () => (dir === 'desc' ? [...docs].reverse() : docs),
          take: async (n: number) => (dir === 'desc' ? [...docs].reverse() : docs).slice(0, n),
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
          const filtered = baseDocs().filter((doc) =>
            filters.every((f) => doc[f.field] === f.value),
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

  return { db: db as any }
}

const baseProvider = {
  name: 'openai',
  models: ['gpt-4o'],
  status: 'active' as const,
  latency: 120,
  createdAt: 1000,
  failureCount: 0,
  avgLatencyMs: 0,
  lastCheckedAt: 0,
  lastSuccessAt: 0,
}

// ---------------------------------------------------------------------------
// updateProviderHealth write side (TD-235)
// ---------------------------------------------------------------------------

describe('updateProviderHealth writes to healthStatus (TD-235)', () => {
  it('writes "healthy" to healthStatus on a successful probe', async () => {
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

  it('preserves the operational status field across a health probe', async () => {
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

  it('writes "degraded" to healthStatus when latency crosses the degraded threshold', async () => {
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

  it('writes "unhealthy" to healthStatus after 3 failures with stale last success', async () => {
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

  it('updates latency, avgLatencyMs, failureCount, lastCheckedAt in the same write', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    const before = Date.now()

    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 250,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.latency).toBe(250)
    expect(updated!.avgLatencyMs).toBeGreaterThan(0)
    expect(updated!.failureCount).toBe(0)
    expect(updated!.lastCheckedAt).toBeGreaterThanOrEqual(before)
  })
})

// ---------------------------------------------------------------------------
// getProviderHealth read side (TD-235)
// ---------------------------------------------------------------------------

describe('getProviderHealth returns both status and healthStatus (TD-235)', () => {
  it('returns a row with healthStatus populated after a successful probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const result = await getProviderHealth(ctx)
    expect(result.length).toBe(1)
    expect(result[0].status).toBe('active')
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

  it('returns healthStatus="degraded" without overwriting the operational status', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      status: 'active',
      avgLatencyMs: 12000,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 15000,
      success: true,
    })

    const result = await getProviderHealth(ctx)
    expect(result[0].healthStatus).toBe('degraded')
    expect(result[0].status).toBe('active')
  })

  it('returns one row per provider, with both fields populated by the last probe', async () => {
    const ctx = createMockCtx()
    const a = await ctx.db.insert('providers', { ...baseProvider, name: 'a' })
    const b = await ctx.db.insert('providers', { ...baseProvider, name: 'b', avgLatencyMs: 12000 })

    await updateProviderHealth(ctx, { providerId: a, latencyMs: 100, success: true })
    await updateProviderHealth(ctx, { providerId: b, latencyMs: 15000, success: true })

    const result = await getProviderHealth(ctx)
    expect(result.length).toBe(2)
    const byName = Object.fromEntries(result.map((r: any) => [r.name, r]))
    expect(byName.a.healthStatus).toBe('healthy')
    expect(byName.b.healthStatus).toBe('degraded')
  })

  it('returns healthStatus=undefined for providers that have never been probed', async () => {
    const ctx = createMockCtx()
    await ctx.db.insert('providers', { ...baseProvider })

    const result = await getProviderHealth(ctx)
    expect(result.length).toBe(1)
    expect(result[0].healthStatus).toBeUndefined()
  })
})
