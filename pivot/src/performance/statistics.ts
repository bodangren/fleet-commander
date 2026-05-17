/**
 * Pure statistical functions for employee performance analytics.
 */

export interface PercentileResult {
  avg: number;
  p50: number;
  p95: number;
  sampleCount: number;
}

export function computePercentiles(values: number[]): PercentileResult {
  return { avg: 0, p50: 0, p95: 0, sampleCount: 0 };
}

export function computeCompletionRate(completed: number, total: number): number {
  return 0;
}
