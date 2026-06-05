import { useMemo } from 'react'

type DependencyNode = {
  taskKey: string
  title: string
  status: string
}

type DependencyGraphMiniProps = {
  taskKey: string
  dependencies: DependencyNode[]
  dependents: DependencyNode[]
}

const statusDotColors: Record<string, string> = {
  done: '#27a644',
  in_progress: '#5e6ad2',
  ready: '#8a8f98',
  blocked: '#eab308',
  backlog: '#62666d',
}

/**
 * Small SVG graph showing a task's immediate dependencies and dependents
 */
export function DependencyGraphMini({
  taskKey,
  dependencies,
  dependents,
}: DependencyGraphMiniProps) {
  const nodeHeight = 28
  const nodeWidth = 160
  const gap = 12
  const centerX = 100
  const centerY = 60

  const layout = useMemo(() => {
    const nodes: Array<{
      x: number
      y: number
      key: string
      title: string
      status: string
      isCenter: boolean
    }> = []

    const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = []

    // Center node (current task)
    nodes.push({
      x: centerX - nodeWidth / 2,
      y: centerY - nodeHeight / 2,
      key: taskKey,
      title: taskKey,
      status: 'active',
      isCenter: true,
    })

    // Dependencies (above)
    const depStartY = centerY - 60
    dependencies.forEach((dep, i) => {
      const x = centerX - nodeWidth / 2
      const y = depStartY - i * (nodeHeight + gap) - nodeHeight
      nodes.push({
        x,
        y,
        key: dep.taskKey,
        title: dep.taskKey,
        status: dep.status,
        isCenter: false,
      })
      edges.push({
        x1: x + nodeWidth / 2,
        y1: y + nodeHeight,
        x2: centerX,
        y2: centerY - nodeHeight / 2,
      })
    })

    // Dependents (below)
    const depEndY = centerY + 60
    dependents.forEach((dep, i) => {
      const x = centerX - nodeWidth / 2
      const y = depEndY + i * (nodeHeight + gap)
      nodes.push({
        x,
        y,
        key: dep.taskKey,
        title: dep.taskKey,
        status: dep.status,
        isCenter: false,
      })
      edges.push({
        x1: centerX,
        y1: centerY + nodeHeight / 2,
        x2: x + nodeWidth / 2,
        y2: y,
      })
    })

    return { nodes, edges }
  }, [taskKey, dependencies, dependents])

  const svgHeight = Math.max(
    120,
    60 + (dependencies.length + dependents.length) * (nodeHeight + gap) + 40,
  )

  if (dependencies.length === 0 && dependents.length === 0) {
    return (
      <div className="text-[11px] text-[#62666d] text-center py-4">No dependency relationships</div>
    )
  }

  return (
    <svg width="200" height={svgHeight} className="mx-auto">
      {layout.edges.map((edge, i) => (
        <line
          key={i}
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
          stroke="#334155"
          strokeWidth={1.5}
          markerEnd="url(#arrowhead)"
        />
      ))}
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#334155" />
        </marker>
      </defs>
      {layout.nodes.map(node => (
        <g key={node.key}>
          <rect
            x={node.x}
            y={node.y}
            width={nodeWidth}
            height={nodeHeight}
            rx={4}
            fill={node.isCenter ? '#1e3a5f' : '#0f1011'}
            stroke={node.isCenter ? '#5e6ad2' : '#23252a'}
            strokeWidth={node.isCenter ? 2 : 1}
          />
          <circle
            cx={node.x + 10}
            cy={node.y + nodeHeight / 2}
            r={4}
            fill={statusDotColors[node.status] ?? '#62666d'}
          />
          <text
            x={node.x + 20}
            y={node.y + nodeHeight / 2 + 4}
            fill="#e2e8f0"
            fontSize={10}
            fontFamily="monospace"
          >
            {node.title.length > 16 ? node.title.slice(0, 16) + '...' : node.title}
          </text>
        </g>
      ))}
    </svg>
  )
}
