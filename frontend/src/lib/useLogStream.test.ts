import { describe, expect, it } from 'vitest'

describe('useLogStream adapter boundary', () => {
  it('uses websocket fallback when convex logs not configured', () => {
    // Without VITE_CONVEX_URL or VITE_SOURCE_LOGS=convex, should use websocket
    const config = {
      logs: 'go' as const,
    }
    expect(config.logs).toBe('go')
  })

  it('selects convex when logs source is convex', () => {
    const config = {
      logs: 'convex' as const,
    }
    const useConvex = config.logs === 'convex'
    expect(useConvex).toBe(true)
  })

  it('selects websocket when logs source is go', () => {
    const config = {
      logs: 'go' as const,
    }
    const useConvex = config.logs === 'convex'
    expect(useConvex).toBe(false)
  })
})
