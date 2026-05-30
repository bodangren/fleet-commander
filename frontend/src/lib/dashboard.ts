/**
 * Calculate budget percent
 * @param actual - The actual cost/spend value
 * @param estimated - The estimated/budgeted value
 * @returns The percentage of budget consumed
 */
export function calculateBudgetPercent(actual: number, estimated: number): number {
  if (estimated === 0) return 0
  return (actual / estimated) * 100
}
