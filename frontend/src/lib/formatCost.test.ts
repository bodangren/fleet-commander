import { describe, expect, it } from 'vitest'
import {
  formatCost,
  formatCostPerPoint,
  formatPointsPerDollar,
  formatReliability,
} from './formatCost'

describe('formatCost', () => {
  it('formats a number as dollar currency', () => {
    expect(formatCost(5)).toBe('$5.00')
    expect(formatCost(0)).toBe('$0.00')
    expect(formatCost(123.456)).toBe('$123.46')
  })

  it('returns dash for non-finite values', () => {
    expect(formatCost(NaN)).toBe('-')
    expect(formatCost(Infinity)).toBe('-')
    expect(formatCost(-Infinity)).toBe('-')
  })
})

describe('formatCostPerPoint', () => {
  it('formats cost per point to 2 decimal places', () => {
    expect(formatCostPerPoint(2.5)).toBe('2.50')
    expect(formatCostPerPoint(0.333)).toBe('0.33')
  })

  it('returns dash for zero', () => {
    expect(formatCostPerPoint(0)).toBe('-')
  })

  it('returns dash for non-finite values', () => {
    expect(formatCostPerPoint(NaN)).toBe('-')
    expect(formatCostPerPoint(Infinity)).toBe('-')
  })
})

describe('formatPointsPerDollar', () => {
  it('formats points per dollar to 2 decimal places', () => {
    expect(formatPointsPerDollar(4.5)).toBe('4.50')
    expect(formatPointsPerDollar(0)).toBe('0.00')
  })

  it('returns dash for non-finite values', () => {
    expect(formatPointsPerDollar(NaN)).toBe('-')
    expect(formatPointsPerDollar(Infinity)).toBe('-')
  })
})

describe('formatReliability', () => {
  it('formats ratio as percentage', () => {
    expect(formatReliability(0.95)).toBe('95%')
    expect(formatReliability(1)).toBe('100%')
    expect(formatReliability(0)).toBe('0%')
  })

  it('returns dash for non-finite values', () => {
    expect(formatReliability(NaN)).toBe('-')
    expect(formatReliability(Infinity)).toBe('-')
  })
})
