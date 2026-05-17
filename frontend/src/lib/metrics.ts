export function deliveryRate(points: number, cost: number): number {
  if (cost === 0) return 0
  return points / cost
}

export function successRate(completed: number, total: number): number {
  if (total === 0) return 0
  return (completed / total) * 100
}

export function rejectionRate(rejected: number, total: number): number {
  if (total === 0) return 0
  return (rejected / total) * 100
}

export function formatPipelineTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}
