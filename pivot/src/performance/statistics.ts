export interface PercentileResult {
  avg: number;
  p50: number;
  p95: number;
  sampleCount: number;
}

/**
 * Compute avg, p50, p95 percentiles and sample count from durations.
 * @param values - Duration values to summarize
 * @returns Percentile summary with sample count
 */
export function computePercentiles(values: number[]): PercentileResult {
  if (values.length === 0) {
    return { avg: 0, p50: 0, p95: 0, sampleCount: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  return { avg: Math.round(avg), p50, p95, sampleCount: sorted.length };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Compute completion rate from completed and total counts.
 * @param completed - Completed run count
 * @param total - Total run count
 * @returns Completed-to-total ratio, or 0 when total is 0
 */
export function computeCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return completed / total;
}
