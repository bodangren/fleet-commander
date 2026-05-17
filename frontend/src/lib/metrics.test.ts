import { describe, expect, it } from 'vitest'
import { deliveryRate, formatPipelineTime, rejectionRate, successRate } from './metrics'

describe('deliveryRate', () => {
  it('returns points per dollar', () => {
    expect(deliveryRate(56, 100)).toBe(0.56)
  })

  it('returns 0 when cost is zero to avoid division by zero', () => {
    expect(deliveryRate(10, 0)).toBe(0)
  })

  it('returns 0 when points is zero', () => {
    expect(deliveryRate(0, 100)).toBe(0)
  })
})

describe('successRate', () => {
  it('returns percentage of completed tasks', () => {
    expect(successRate(92, 100)).toBe(92)
  })

  it('returns 0 when total is zero to avoid division by zero', () => {
    expect(successRate(0, 0)).toBe(0)
  })

  it('returns 100 when all tasks are completed', () => {
    expect(successRate(100, 100)).toBe(100)
  })
})

describe('rejectionRate', () => {
  it('returns percentage of rejected items', () => {
    expect(rejectionRate(8, 100)).toBe(8)
  })

  it('returns 0 when total is zero to avoid division by zero', () => {
    expect(rejectionRate(0, 0)).toBe(0)
  })

  it('returns 100 when all items are rejected', () => {
    expect(rejectionRate(50, 50)).toBe(100)
  })
})

describe('formatPipelineTime', () => {
  it('formats seconds to minutes and seconds', () => {
    expect(formatPipelineTime(512)).toBe('8m 32s')
  })

  it('formats less than one minute', () => {
    expect(formatPipelineTime(45)).toBe('0m 45s')
  })

  it('formats exactly one minute', () => {
    expect(formatPipelineTime(60)).toBe('1m 0s')
  })

  it('formats zero seconds', () => {
    expect(formatPipelineTime(0)).toBe('0m 0s')
  })
})
