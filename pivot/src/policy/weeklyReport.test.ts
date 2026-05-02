import { describe, expect, test } from 'bun:test';

// Test the report computation logic (extracted for testability)
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function computeFactorStats(
  records: { breakdownJson: string; outcome: string }[],
  factor: string,
) {
  const accepted = records.filter((r) => r.outcome === 'accepted');
  const rejected = records.filter((r) => r.outcome === 'rejected');

  const values = records.map((r) => {
    const bd = JSON.parse(r.breakdownJson);
    return bd[factor] ?? 0;
  });

  const acceptedValues = accepted.map((r) => {
    const bd = JSON.parse(r.breakdownJson);
    return bd[factor] ?? 0;
  });

  const rejectedValues = rejected.map((r) => {
    const bd = JSON.parse(r.breakdownJson);
    return bd[factor] ?? 0;
  });

  const mean = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length);
  const meanAll = mean(values);
  const meanAccepted = mean(acceptedValues);
  const meanRejected = mean(rejectedValues);

  const n1 = acceptedValues.length;
  const n0 = rejectedValues.length;
  const n = n1 + n0;
  const sd = standardDeviation(values);
  const correlation = n === 0 || sd === 0 ? 0 : ((meanAccepted - meanRejected) / sd) * Math.sqrt((n1 * n0) / (n * n));

  return { meanAccepted, meanRejected, meanAll, correlation };
}

describe('weekly report computations', () => {
  test('standardDeviation computes correctly', () => {
    expect(standardDeviation([])).toBe(0);
    expect(standardDeviation([5, 5, 5, 5])).toBe(0);
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 0);
  });

  test('computeFactorStats groups by outcome', () => {
    const records = [
      { breakdownJson: JSON.stringify({ priority: 1.0 }), outcome: 'accepted' },
      { breakdownJson: JSON.stringify({ priority: 1.5 }), outcome: 'accepted' },
      { breakdownJson: JSON.stringify({ priority: 0.5 }), outcome: 'rejected' },
      { breakdownJson: JSON.stringify({ priority: 0.3 }), outcome: 'rejected' },
    ];

    const stats = computeFactorStats(records, 'priority');
    expect(stats.meanAccepted).toBeCloseTo(1.25, 2);
    expect(stats.meanRejected).toBeCloseTo(0.4, 2);
    expect(stats.meanAll).toBeCloseTo(0.825, 2);
    expect(stats.correlation).toBeGreaterThan(0); // higher priority correlates with acceptance
  });

  test('computeFactorStats handles missing factor', () => {
    const records = [
      { breakdownJson: JSON.stringify({ other: 1.0 }), outcome: 'accepted' },
      { breakdownJson: JSON.stringify({}), outcome: 'rejected' },
    ];

    const stats = computeFactorStats(records, 'priority');
    expect(stats.meanAll).toBe(0);
    expect(stats.correlation).toBe(0);
  });

  test('computeFactorStats handles single outcome type', () => {
    const records = [
      { breakdownJson: JSON.stringify({ priority: 1.0 }), outcome: 'accepted' },
      { breakdownJson: JSON.stringify({ priority: 2.0 }), outcome: 'accepted' },
    ];

    const stats = computeFactorStats(records, 'priority');
    expect(stats.meanRejected).toBe(0);
    expect(stats.correlation).toBe(0); // n0 = 0
  });
});
