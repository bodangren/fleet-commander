/**
 * Formats a decimal ratio as a percentage string
 * @param rate - Rate as decimal (0-1)
 * @returns Percentage string (e.g., "95%")
 */
export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}
