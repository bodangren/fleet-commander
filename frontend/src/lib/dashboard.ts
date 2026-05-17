export function calculateBudgetPercent(actual: number, estimated: number): number {
  if (estimated === 0) return 0
  return (actual / estimated) * 100
}
