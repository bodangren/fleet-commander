import { describe, expect, it } from 'bun:test';
import { computeSimilarity } from './similarity';

describe('computeSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(computeSimilarity('hello', 'hello')).toBe(1);
  });

  it('returns 0 for empty strings', () => {
    expect(computeSimilarity('', 'hello')).toBe(0);
    expect(computeSimilarity('hello', '')).toBe(0);
  });

  it('returns a value between 0 and 1 for similar strings', () => {
    const score = computeSimilarity('hello world', 'hello World');
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThan(1);
  });

  it('returns low score for very different strings', () => {
    const score = computeSimilarity('abc', 'xyz');
    expect(score).toBeLessThan(0.5);
  });

  it('handles long strings by sampling', () => {
    const a = 'a'.repeat(1000);
    const b = 'a'.repeat(1000);
    expect(computeSimilarity(a, b)).toBe(1);
  });
});
