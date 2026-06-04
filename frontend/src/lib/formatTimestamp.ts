/**
 * Formats a Unix timestamp (ms) as a relative time string
 * @param ts - Unix timestamp in milliseconds
 * @returns Relative time string (e.g., "just now", "5m ago", "2h ago", "3d ago")
 */
export function formatRelativeTime(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Formats a Unix timestamp (ms) as a short date string
 * @param ts - Unix timestamp in milliseconds
 * @returns Localized date string
 */
export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString()
}

/**
 * Formats a Unix timestamp (ms) as HH:MM:SS
 * @param ts - Unix timestamp in milliseconds
 * @returns Time-of-day string (e.g., "14:30:05")
 */
export function formatTimeOfDay(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
