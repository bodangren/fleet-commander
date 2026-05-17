import { describe, expect, it } from 'bun:test';
import { evaluateRegression } from './evaluateRegression';

describe('evaluateRegression', () => {
  it('returns no alert when degradation is 19% for a 20% threshold', () => {
    const result = evaluateRegression({
      current: 119,
      baseline: 100,
      threshold: 0.2,
      direction: 'increase',
    });
    expect(result.alerted).toBe(false);
    expect(result.degradationPercent).toBeCloseTo(19, 0);
  });

  it('returns no alert when degradation is exactly 20% for a 20% threshold', () => {
    const result = evaluateRegression({
      current: 120,
      baseline: 100,
      threshold: 0.2,
      direction: 'increase',
    });
    expect(result.alerted).toBe(false);
    expect(result.degradationPercent).toBeCloseTo(20, 0);
  });

  it('returns alert when degradation is 21% for a 20% threshold', () => {
    const result = evaluateRegression({
      current: 121,
      baseline: 100,
      threshold: 0.2,
      direction: 'increase',
    });
    expect(result.alerted).toBe(true);
    expect(result.degradationPercent).toBeCloseTo(21, 0);
  });

  it('returns warning severity for moderate degradation (20-30%)', () => {
    const result = evaluateRegression({
      current: 125,
      baseline: 100,
      threshold: 0.2,
      direction: 'increase',
    });
    expect(result.alerted).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns critical severity for severe degradation (>30%)', () => {
    const result = evaluateRegression({
      current: 150,
      baseline: 100,
      threshold: 0.2,
      direction: 'increase',
    });
    expect(result.alerted).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('returns no alert when baseline is zero to avoid division by zero', () => {
    const result = evaluateRegression({
      current: 150,
      baseline: 0,
      threshold: 0.2,
      direction: 'increase',
    });
    expect(result.alerted).toBe(false);
    expect(result.degradationPercent).toBe(0);
  });

  it('returns no alert for decrease direction when current improves', () => {
    const result = evaluateRegression({
      current: 0.95,
      baseline: 0.8,
      threshold: 0.15,
      direction: 'decrease',
    });
    expect(result.alerted).toBe(false);
  });

  it('returns alert for decrease direction when value drops below threshold', () => {
    const result = evaluateRegression({
      current: 0.7,
      baseline: 0.9,
      threshold: 0.15,
      direction: 'decrease',
    });
    expect(result.alerted).toBe(true);
    expect(result.degradationPercent).toBeCloseTo(22, 0);
    expect(result.severity).toBe('warning');
  });

  it('returns no alert when improvement exceeds threshold in favourable direction', () => {
    const result = evaluateRegression({
      current: 80,
      baseline: 100,
      threshold: 0.2,
      direction: 'increase',
    });
    expect(result.alerted).toBe(false);
    expect(result.degradationPercent).toBe(0);
  });
});
