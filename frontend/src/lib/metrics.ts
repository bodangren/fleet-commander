/**
 * delivery: rate
 * @param points - Number of delivery points
 * @param cost - Total cost
 * @returns Delivery rate (points per cost unit)
 */
export function deliveryRate(points: number, cost: number): number {
  if (cost === 0) return 0
  return points / cost
}

/**
 * success: rate
 * @param completed - Number of completed items
 * @param total - Total number of items
 * @returns Success rate as percentage
 */
export function successRate(completed: number, total: number): number {
  if (total === 0) return 0
  return (completed / total) * 100
}

/**
 * rejection: rate
 * @param rejected - Number of rejected items
 * @param total - Total number of items
 * @returns Rejection rate as percentage
 */
export function rejectionRate(rejected: number, total: number): number {
  if (total === 0) return 0
  return (rejected / total) * 100
}

/**
 * Format pipeline time
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "5m 30s")
 */
export function formatPipelineTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}
