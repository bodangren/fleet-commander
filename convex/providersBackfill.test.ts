/**
 * Phase 3 / TD-235 backfill idempotency test.
 *
 * Per test-strategy §3: "Backfill idempotency (Phase 3): convex/providers.ts:282-294
 *  already exists. Test must run the backfill twice and assert no second write."
 * Per test-strategy §5 (Phase 3 row): "Add a convex/providersBackfill.test.ts case
 *  for idempotent migration."
 *
 * The companion `providerHealthVocabulary.test.ts` already covers the
 * happy-path backfill and the write-once/don't-overwrite cases. This file
 * focuses exclusively on the idempotency invariant: running the backfill
 * N times must produce the same final state as running it once.
 *
 * Spec:       measure/tracks/status_vocabulary_unification_20260605/spec.md
 * Test-strategy: §3 (backfill idempotency), §5 (Phase 3 row)
 * Plan:       Phase 3 Task 3 — Convex migration: backfill `healthStatus`
 */
import { describe, expect, it } from 'bun:test'
import { backfillProviderHealthStatus } from './providers'

type MockDoc = { _id: string } & Record<string, unknown>

function createMockCtx() {
  const tables: Record<string, Map<string, MockDoc>> = {}

  function getTable(name: string): Map<string, MockDoc> {
    if (!tables[name]) tables[name] = new Map()
    return tables[name]
  }

  let patchCount = 0

  const db = {
    query: (table: string) => {
      const docs = () => Array.from(getTable(table).values())
      return {
        collect: async () => docs(),
        withIndex: () => ({ collect: async () => docs() }),
        order: () => ({ collect: async () => docs(), take: async (n: number) => docs().slice(0, n) }),
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
      patchCount++
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

  return { db: db as any, getPatchCount: () => patchCount, resetPatchCount: () => { patchCount = 0 } }
}

function makeProvider(overrides: Partial<MockDoc> = {}): MockDoc {
  return {
    name: 'openai',
    models: ['gpt-4o'],
    status: 'active',
    createdAt: 1000,
    failureCount: 0,
    avgLatencyMs: 0,
    lastCheckedAt: 0,
    lastSuccessAt: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Existence
// ---------------------------------------------------------------------------

describe('backfillProviderHealthStatus (TD-235) is exported', () => {
  it('is exported from convex/providers', () => {
    expect(backfillProviderHealthStatus).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Idempotency: the test-strategy §3 explicit invariant
// ---------------------------------------------------------------------------

describe('backfillProviderHealthStatus is idempotent', () => {
  it('running it twice produces no second write for a single missing-healthStatus row', async () => {
    const ctx = createMockCtx()
    ctx.resetPatchCount()
    const providerId = await ctx.db.insert('providers', makeProvider())

    await backfillProviderHealthStatus(ctx, {})
    const patchesAfterFirst = ctx.getPatchCount()
    await backfillProviderHealthStatus(ctx, {})
    const patchesAfterSecond = ctx.getPatchCount()

    expect(patchesAfterFirst).toBe(1)
    expect(patchesAfterSecond - patchesAfterFirst).toBe(0)

    const final = await ctx.db.get(providerId)
    expect(final!.healthStatus).toBe('healthy')
  })

  it('running it N times writes at most once per row, regardless of N', async () => {
    const ctx = createMockCtx()
    ctx.resetPatchCount()
    const providerId = await ctx.db.insert('providers', makeProvider())

    for (let i = 0; i < 5; i++) {
      await backfillProviderHealthStatus(ctx, {})
    }

    // Exactly one patch for the one missing-healthStatus row.
    expect(ctx.getPatchCount()).toBe(1)
    const final = await ctx.db.get(providerId)
    expect(final!.healthStatus).toBe('healthy')
  })

  it('preserves a pre-existing healthStatus="degraded" across N runs', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', makeProvider({ healthStatus: 'degraded' }))

    for (let i = 0; i < 3; i++) {
      await backfillProviderHealthStatus(ctx, {})
    }

    const final = await ctx.db.get(providerId)
    expect(final!.healthStatus).toBe('degraded')
  })

  it('preserves a pre-existing healthStatus="unhealthy" across N runs', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', makeProvider({ healthStatus: 'unhealthy' }))

    for (let i = 0; i < 3; i++) {
      await backfillProviderHealthStatus(ctx, {})
    }

    const final = await ctx.db.get(providerId)
    expect(final!.healthStatus).toBe('unhealthy')
  })

  it('mixed cohort: missing rows converge to "healthy", present rows untouched, regardless of run count', async () => {
    const ctx = createMockCtx()
    const missing = await ctx.db.insert('providers', makeProvider({ name: 'a' }))
    const degraded = await ctx.db.insert('providers', makeProvider({ name: 'b', healthStatus: 'degraded' }))
    const unhealthy = await ctx.db.insert('providers', makeProvider({ name: 'c', healthStatus: 'unhealthy' }))

    const first = await backfillProviderHealthStatus(ctx, {})
    expect(first.backfilledCount).toBe(1)

    const second = await backfillProviderHealthStatus(ctx, {})
    expect(second.backfilledCount).toBe(0)

    const third = await backfillProviderHealthStatus(ctx, {})
    expect(third.backfilledCount).toBe(0)

    expect((await ctx.db.get(missing))!.healthStatus).toBe('healthy')
    expect((await ctx.db.get(degraded))!.healthStatus).toBe('degraded')
    expect((await ctx.db.get(unhealthy))!.healthStatus).toBe('unhealthy')
  })

  it('convergent: backfilledCount drops to 0 on every run after the first', async () => {
    const ctx = createMockCtx()
    await ctx.db.insert('providers', makeProvider({ name: 'a' }))
    await ctx.db.insert('providers', makeProvider({ name: 'b' }))
    await ctx.db.insert('providers', makeProvider({ name: 'c', healthStatus: 'degraded' }))

    const r1 = await backfillProviderHealthStatus(ctx, {})
    const r2 = await backfillProviderHealthStatus(ctx, {})
    const r3 = await backfillProviderHealthStatus(ctx, {})

    expect(r1.backfilledCount).toBe(2)
    expect(r2.backfilledCount).toBe(0)
    expect(r3.backfilledCount).toBe(0)
  })
})
