export interface FormatDurationOptions {
  round?: boolean
}

export function formatDuration(ms: number, options?: FormatDurationOptions): string {
  const round = options?.round ?? false
  if (ms < 1000) return `${ms}ms`
  const secs = round ? Math.round(ms / 1000) : Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = round ? Math.round(secs / 60) : Math.floor(secs / 60)
  const remainingSecs = secs % 60
  if (mins < 60) return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`
  const hours = round ? Math.round(mins / 60) : Math.floor(mins / 60)
  const remainingMins = mins % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}
