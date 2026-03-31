interface ProjectHealthBadgeProps {
  health: string
  lastError?: string
}

export function ProjectHealthBadge({ health, lastError }: ProjectHealthBadgeProps) {
  const colors: Record<string, string> = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    error: 'bg-red-500',
  }

  const labels: Record<string, string> = {
    healthy: 'Healthy',
    degraded: 'Degraded',
    error: 'Error',
  }

  const color = colors[health] ?? 'bg-gray-400'
  const label = labels[health] ?? health

  return (
    <span className="inline-flex items-center gap-1.5" title={lastError || label}>
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  )
}
