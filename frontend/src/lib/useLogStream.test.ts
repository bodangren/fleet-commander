import { describe, expect, it } from 'vitest'
import { shouldUseConvexLogs } from './useLogStream'

describe('useLogStream adapter boundary', () => {
  it('uses websocket fallback when logs source is bun', () => {
    expect(shouldUseConvexLogs('bun', 'https://demo.convex.cloud')).toBe(false)
  })

  it('uses websocket fallback when convex url is missing', () => {
    expect(shouldUseConvexLogs('convex', undefined)).toBe(false)
  })

  it('selects convex stream only when source is convex and url is configured', () => {
    expect(shouldUseConvexLogs('convex', 'https://demo.convex.cloud')).toBe(true)
  })
})
