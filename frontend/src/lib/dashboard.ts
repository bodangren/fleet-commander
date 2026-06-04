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

export const DASHBOARD_COLORS = {
  cardBg: '#0f1011',
  border: '#23252a',
  cardInner: '#141516',
  textPrimary: '#f7f8f8',
  textMuted: '#8a8f98',
  textDim: '#62666d',
  accent: '#5e6ad2',
  success: '#27a644',
  warning: '#eab308',
  danger: '#eb3d54',
}

/**
 * Formats a number as USD currency string
 * @param amount - The amount to format
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Formats hours into a human-readable duration string
 * @param hours - Number of hours
 */
export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours)}h`
  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}
