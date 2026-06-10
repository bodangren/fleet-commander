/**
 * Phase 1: Inventory & Scaffold — `src/router.tsx` shape test.
 *
 * Spec:  measure/tracks/react_router_7_migration_20260611/spec.md
 * Plan:  measure/tracks/react_router_7_migration_20260611/plan.md (Task 1.3)
 * Strategy: measure/tracks/react_router_7_migration_20260611/test-strategy.md §5, §7
 *
 * Task 1.3 contract: scaffold `src/router.tsx` with `createBrowserRouter([])`
 * (a `Router` instance or a factory that returns one) so that Phase 2 can
 * populate the route tree. The test asserts the module exists and exposes a
 * router-shaped value. The assertion is deliberately tolerant of either
 * shape — a `const router = createBrowserRouter([])` export or a
 * `createAppRouter(routes)` factory — because both are valid scaffolding
 * choices; Phase 2 will pin the exact shape.
 *
 * Red signal: `@/router` is not yet on disk, so the dynamic import in the
 * first test throws "Cannot find module '@/router'". This is a live
 * implementation-missing failure (not a stale-durable-record check),
 * satisfying the "current implementation is missing or wrong" contract.
 */
import { describe, expect, it } from 'vitest'

describe("frontend/src/router.tsx — Phase 1 scaffold (Task 1.3)", () => {
  it('module can be imported from @/router (currently missing — Red signal)', async () => {
    // Dynamic import so the missing-module error is reported as a test
    // failure rather than a top-level syntax error before the suite runs.
    const mod = await import('@/router')
    expect(mod).toBeDefined()
  })

  it('exposes a Router instance or a factory that returns one', async () => {
    const mod = await import('@/router')
    const exports = Object.values(mod)
    expect(exports.length).toBeGreaterThan(0)
    // A `createBrowserRouter([])` result is a Router with `.subscribe` and
    // `.state`; a factory is a function. Accept either Phase-1 shape.
    const isRouter = exports.some(
      (e): e is { subscribe: unknown; state: unknown } =>
        typeof e === 'object' &&
        e !== null &&
        'subscribe' in e &&
        'state' in e,
    )
    const isFactory = exports.some((e) => typeof e === 'function')
    expect(isRouter || isFactory).toBe(true)
  })
})
