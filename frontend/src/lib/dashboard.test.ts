import { describe, expect, it } from 'vitest'
import { calculateBudgetPercent } from './dashboard'

describe('calculateBudgetPercent', () => {
  it('returns 50 when actual is half of estimated', () => {
    expect(calculateBudgetPercent(250, 500)).toBe(50)
  })

  it('returns 100 when actual equals estimated', () => {
    expect(calculateBudgetPercent(500, 500)).toBe(100)
  })

  it('returns 0 when actual is zero', () => {
    expect(calculateBudgetPercent(0, 500)).toBe(0)
  })

  it('returns 0 when estimated is zero to avoid division by zero', () => {
    expect(calculateBudgetPercent(450, 0)).toBe(0)
  })

  it('returns >100 when actual exceeds estimated', () => {
    expect(calculateBudgetPercent(600, 500)).toBe(120)
  })
})
