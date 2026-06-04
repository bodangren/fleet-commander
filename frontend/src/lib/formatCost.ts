/**
 * Formats number as dollar currency string, returns dash for non-finite values
 * @param value - The number to format
 * @returns Formatted currency string or dash for non-finite values
 */
export function formatCost(value: number): string {
  if (!Number.isFinite(value)) return '-'
  return '$' + value.toFixed(2)
}

/**
 * Formats cost per point value for display
 * @param cost - The cost per point to format
 * @returns Formatted cost string or dash for zero/non-finite values
 */
export function formatCostPerPoint(cost: number): string {
  if (!Number.isFinite(cost) || cost === 0) return '-'
  return cost.toFixed(2)
}

/**
 * Formats points per dollar value for display
 * @param ppd - Points per dollar to format
 * @returns Formatted number string or dash for non-finite values
 */
export function formatPointsPerDollar(ppd: number): string {
  if (!Number.isFinite(ppd)) return '-'
  return ppd.toFixed(2)
}

/**
 * Formats reliability ratio as percentage string
 * @param rel - The reliability ratio (0-1) to format
 * @returns Formatted percentage string or dash for non-finite values
 */
export function formatReliability(rel: number): string {
  if (!Number.isFinite(rel)) return '-'
  return (rel * 100).toFixed(0) + '%'
}
