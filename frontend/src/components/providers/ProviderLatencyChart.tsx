interface LatencyChartProps {
  data: number[]
  width?: number
  height?: number
  className?: string
}

/**
 * Renders a sparkline chart of provider latency values.
 * Uses inline SVG for lightweight rendering without chart libraries.
 */
export function ProviderLatencyChart({
  data,
  width = 120,
  height = 32,
  className = '',
}: LatencyChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-muted-foreground ${className}`}
        style={{ width, height }}
      >
        No data
      </div>
    )
  }

  if (data.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        className={`${className}`}
        viewBox={`0 0 ${width} ${height}`}
      >
        <circle cx={width / 2} cy={height / 2} r={2} className="fill-green-500" />
      </svg>
    )
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })

  const polyline = points.join(' ')

  // Color based on latest value
  const latest = data[data.length - 1]
  let strokeColor = 'stroke-green-500'
  if (latest > 10_000) {
    strokeColor = 'stroke-red-500'
  } else if (latest > 5_000) {
    strokeColor = 'stroke-yellow-500'
  }

  return (
    <svg
      width={width}
      height={height}
      className={`${className}`}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={polyline}
        fill="none"
        className={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
