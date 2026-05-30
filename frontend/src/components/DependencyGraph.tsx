import { useCallback, useEffect, useState } from 'react'
import { Background, Controls, type Edge, type Node, Position, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DependencyNode = {
  taskId: string
  description: string
  status: string
  phase: string
}

type DependencyEdge = {
  from: string
  to: string
}

type GraphResponse = {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
}

type CriticalPathResponse = {
  criticalPath: string[]
  hasCycle: boolean
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  todo: { bg: '#1e293b', border: '#64748b', text: '#94a3b8' },
  active: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
  blocked: { bg: '#3b1a1a', border: '#ef4444', text: '#fca5a5' },
  done: { bg: '#1a3b2a', border: '#22c55e', text: '#86efac' },
}

/**
 * Build react flow nodes from dependency data
 * @param nodes - Array of dependency nodes
 * @param criticalPath - Array of task IDs on the critical path
 * @returns Array of ReactFlow Node objects
 */
function buildReactFlowNodes(nodes: DependencyNode[], criticalPath: string[]): Node[] {
  const cols = Math.ceil(Math.sqrt(nodes.length))
  return nodes.map((node, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const isCritical = criticalPath.includes(node.taskId)
    const colors = statusColors[node.status] ?? statusColors.todo
    return {
      id: node.taskId,
      position: { x: col * 280, y: row * 120 },
      data: {
        label: (
          <div style={{ padding: '8px', minWidth: 200 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.text,
                marginBottom: 4,
              }}
            >
              {node.taskId}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#e2e8f0',
                lineHeight: 1.4,
                maxWidth: 240,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {node.description}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#64748b',
                marginTop: 4,
                textTransform: 'uppercase',
              }}
            >
              {node.status}
              {isCritical && (
                <span
                  style={{
                    marginLeft: 6,
                    color: '#f59e0b',
                    fontWeight: 600,
                  }}
                >
                  critical
                </span>
              )}
            </div>
          </div>
        ),
      },
      style: {
        background: colors.bg,
        border: `2px solid ${isCritical ? '#f59e0b' : colors.border}`,
        borderRadius: 8,
        width: 260,
        boxShadow: isCritical ? '0 0 12px rgba(245, 158, 11, 0.3)' : 'none',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }
  })
}

/**
 * Build react flow edges from dependency data
 * @param edges - Array of dependency edges
 * @param criticalPath - Array of task IDs on the critical path
 * @returns Array of ReactFlow Edge objects
 */
function buildReactFlowEdges(edges: DependencyEdge[], criticalPath: string[]): Edge[] {
  return edges.map(edge => {
    const isCritical = criticalPath.includes(edge.from) && criticalPath.includes(edge.to)
    const fromIdx = criticalPath.indexOf(edge.from)
    const toIdx = criticalPath.indexOf(edge.to)
    const isCriticalEdge = isCritical && toIdx === fromIdx + 1
    return {
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      animated: isCriticalEdge,
      style: {
        stroke: isCriticalEdge ? '#f59e0b' : '#475569',
        strokeWidth: isCriticalEdge ? 3 : 1.5,
      },
    }
  })
}

/**
 * Renders a graph visualization of task dependencies using ReactFlow
 * @param projectId - Project identifier
 */
export function DependencyGraph({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [criticalPath, setCriticalPath] = useState<string[]>([])
  const [hasCycle, setHasCycle] = useState(false)
  const [showCriticalOnly, setShowCriticalOnly] = useState(false)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const onNodesChange = useCallback(() => {}, [])
  const onEdgesChange = useCallback(() => {}, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [graphRes, cpRes] = await Promise.all([
        fetch(`/api/projects/${encodeURIComponent(projectId)}/dependencies`),
        fetch(`/api/projects/${encodeURIComponent(projectId)}/critical-path`),
      ])

      if (!graphRes.ok) {
        throw new Error('Failed to load dependency graph')
      }

      const graphData = (await graphRes.json()) as GraphResponse
      setGraph(graphData)

      if (cpRes.ok) {
        const cpData = (await cpRes.json()) as CriticalPathResponse
        setCriticalPath(cpData.criticalPath ?? [])
        setHasCycle(cpData.hasCycle ?? false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!graph) return
    const rfNodes = buildReactFlowNodes(graph.nodes, criticalPath)
    const rfEdges = buildReactFlowEdges(graph.edges, criticalPath)

    if (showCriticalOnly) {
      const criticalSet = new Set(criticalPath)
      setNodes(rfNodes.filter(n => criticalSet.has(n.id)))
      setEdges(rfEdges.filter(e => criticalSet.has(e.source) && criticalSet.has(e.target)))
    } else {
      setNodes(rfNodes)
      setEdges(rfEdges)
    }
  }, [graph, criticalPath, showCriticalOnly])

  if (loading) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>Loading dependency graph...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/10">
        <CardHeader>
          <CardTitle className="text-red-200">Error loading graph</CardTitle>
          <CardDescription className="text-red-100">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>Dependency Graph</CardTitle>
          <CardDescription>
            No dependency relationships found. Add{' '}
            <code className="rounded bg-black/30 px-1">depends_on:</code> to task lines in plan.md.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <CardTitle>Dependency Graph</CardTitle>
            <CardDescription>
              {graph.nodes.length} tasks, {graph.edges.length} dependencies.
              {hasCycle && <span className="ml-2 text-amber-400">⚠ Cycle detected in graph.</span>}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {criticalPath.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showCriticalOnly}
                  onChange={e => setShowCriticalOnly(e.target.checked)}
                  className="rounded border-border/60"
                />
                Critical path only
              </label>
            )}
            <button
              type="button"
              onClick={() => void fetchData()}
              className="rounded border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground hover:bg-background"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(statusColors).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ background: colors.border }} />
              <span className="text-muted-foreground capitalize">{status}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Critical path</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="h-96 rounded-2xl border border-border/60 bg-black/20"
          style={{ width: '100%' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            minZoom={0.1}
            maxZoom={2}
          >
            <Background color="#334155" gap={16} />
            <Controls
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 6,
              }}
            />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  )
}
