import { useCallback, useEffect, useRef, useState } from 'react'

export type FleetStatus = {
  activeTasks: number
  blockedTasks: number
  openIssues: number
  activeRuns: number
  todayCost: number
  attentionProjects: Array<{
    slug: string
    name: string
    reason: string
  }>
}

export type BlockedTask = {
  projectSlug: string
  trackId: string
  taskKey: string
  title: string
  status: string
  assignee?: string
  updatedAt: number
  projectName?: string
}

export type OpenIssue = {
  projectSlug: string
  trackId?: string
  issueId: string
  title: string
  status: string
  assignedAgent?: string
  openedAt: number
  projectName?: string
}

export type BlockersData = {
  blockedTasks: BlockedTask[]
  openIssues: OpenIssue[]
}

export type ActiveRun = {
  projectSlug: string
  runId: string
  status: string
  selectedTaskKey?: string
  runnerHost?: string
  startedAt: number
  totalMs?: number
  projectName?: string
}

export type AgentWorkload = {
  name: string
  displayName: string
  mode: string
  model: string
  currentTask?: {
    taskKey: string
    title: string
    projectSlug: string
    projectName?: string
  }
  successRate7d: number
  medianLatencyMs: number
  queueDepth: number
  circuitState?: 'closed' | 'open' | 'half-open'
}

export type AlertEntry = {
  _id: string
  type: string
  severity: string
  message: string
  contextJson: string
  resolved: boolean
  resolvedAt?: number
  createdAt: number
}

export type Sprint = {
  _id: string
  projectSlug: string
  name: string
  status: string
  startDate: number
  endDate: number
  goal?: string
  taskKeys: string[]
  updatedAt: number
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json() as Promise<T>
}

export function useFleetStatus(pollMs = 30000) {
  const [data, setData] = useState<FleetStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const result = await fetchJson<FleetStatus>('/api/fleet/status')
      if (mountedRef.current) {
        setData(result)
        setError(null)
        setLoading(false)
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Unknown error')
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refresh()
    const interval = setInterval(() => void refresh(), pollMs)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [refresh, pollMs])

  return { data, loading, error, refresh }
}

export function useBlockers(project?: string, agent?: string) {
  const [data, setData] = useState<BlockersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (project) params.set('project', project)
    if (agent) params.set('agent', agent)
    const qs = params.toString()
    const url = `/api/fleet/blockers${qs ? `?${qs}` : ''}`

    fetchJson<BlockersData>(url)
      .then(result => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [project, agent])

  return { data, loading, error }
}

export function useActiveRuns(pollMs = 10000) {
  const [data, setData] = useState<ActiveRun[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const result = await fetchJson<{ activeRuns: ActiveRun[] }>('/api/fleet/queue')
      if (mountedRef.current) {
        setData(result.activeRuns)
        setError(null)
        setLoading(false)
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Unknown error')
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refresh()
    const interval = setInterval(() => void refresh(), pollMs)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [refresh, pollMs])

  return { data, loading, error, refresh }
}

export function useAgentWorkload() {
  const [data, setData] = useState<AgentWorkload[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchJson<AgentWorkload[]>('/api/agents/workload')
      .then(result => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}

export function useAlerts(
  severity?: 'critical' | 'warning' | 'info',
  type?: string,
  resolved?: boolean,
) {
  const [data, setData] = useState<AlertEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [criticalCount, setCriticalCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (severity) params.set('severity', severity)
    if (type) params.set('type', type)
    if (resolved !== undefined) params.set('resolved', String(resolved))
    const qs = params.toString()
    const url = `/api/alerts${qs ? `?${qs}` : ''}`

    fetchJson<{ alerts: AlertEntry[] }>(url)
      .then(result => {
        if (!cancelled) {
          setData(result.alerts)
          setCriticalCount(
            result.alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
          )
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [severity, type, resolved])

  const resolveAlert = useCallback(async (alertId: string) => {
    await fetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' })
    setData(
      prev =>
        prev?.map(a =>
          a._id === alertId ? { ...a, resolved: true, resolvedAt: Date.now() } : a,
        ) ?? null,
    )
  }, [])

  return { data, loading, error, criticalCount, resolveAlert }
}

export type EmployeePerformanceData = {
  baselines: Array<{
    taskKind: string
    avgDurationMs: number
    p50DurationMs: number
    p95DurationMs: number
    completionRate: number
    sampleCount: number
  }>
  runs: Array<{
    taskId: string
    employeeId: string
    status: string
    startedAt: number
    finishedAt: number
  }>
}

export function useEmployeePerformance(
  employeeId: string | undefined,
  projectId: string | undefined,
  windowDays = 30,
) {
  const [data, setData] = useState<EmployeePerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!employeeId || !projectId) {
      setData(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const url = `/api/performance/employee/${encodeURIComponent(employeeId)}?projectId=${encodeURIComponent(projectId)}&windowDays=${windowDays}`
    fetchJson<{ data: EmployeePerformanceData | null; message?: string }>(url)
      .then(result => {
        if (!cancelled) {
          setData(result.data)
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [employeeId, projectId, windowDays])

  return { data, loading, error }
}

export function useActiveSprint(projectSlug: string | undefined) {
  const [data, setData] = useState<Sprint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectSlug) {
      setData(null)
      setLoading(false)
      return
    }

    let cancelled = false
    fetchJson<Sprint | null>(`/api/projects/${encodeURIComponent(projectSlug)}/sprints/active`)
      .then(result => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectSlug])

  return { data, loading, error }
}
