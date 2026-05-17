import { describe, expect, it } from 'bun:test';
import { computePercentiles, computeCompletionRate } from './statistics';

describe('computePercentiles', () => {
  it('returns avg, p50, p95 for a sorted three-element array', () => {
    const result = computePercentiles([100, 200, 300]);
    expect(result.avg).toBe(200);
    expect(result.p50).toBe(200);
    expect(result.p95).toBe(300);
    expect(result.sampleCount).toBe(3);
  });

  it('handles an empty array', () => {
    const result = computePercentiles([]);
    expect(result.avg).toBe(0);
    expect(result.p50).toBe(0);
    expect(result.p95).toBe(0);
    expect(result.sampleCount).toBe(0);
  });

  it('handles a single element', () => {
    const result = computePercentiles([150]);
    expect(result.avg).toBe(150);
    expect(result.p50).toBe(150);
    expect(result.p95).toBe(150);
    expect(result.sampleCount).toBe(1);
  });

  it('handles an unsorted array', () => {
    const result = computePercentiles([300, 100, 200]);
    expect(result.avg).toBe(200);
    expect(result.p50).toBe(200);
    expect(result.p95).toBe(300);
    expect(result.sampleCount).toBe(3);
  });

  it('handles two elements', () => {
    const result = computePercentiles([100, 200]);
    expect(result.avg).toBe(150);
    expect(result.p50).toBe(100);
    expect(result.p95).toBe(200);
    expect(result.sampleCount).toBe(2);
  });

  it('handles larger arrays with correct percentile indexing', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const result = computePercentiles(values);
    expect(result.avg).toBe(55);
    expect(result.p50).toBe(50);
    expect(result.p95).toBe(100);
    expect(result.sampleCount).toBe(10);
  });
});

describe('computeCompletionRate', () => {
  it('returns 0.8 for 8 completed out of 10', () => {
    expect(computeCompletionRate(8, 10)).toBe(0.8);
  });

  it('returns 1.0 when all are completed', () => {
    expect(computeCompletionRate(5, 5)).toBe(1);
  });

  it('returns 0 when total is 0', () => {
    expect(computeCompletionRate(0, 0)).toBe(0);
  });
});
