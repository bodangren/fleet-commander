import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  AgentRecord,
  AgentTestResult,
  ApiStatus,
  HarnessDiscoveryResult,
  HarnessRecord,
  ProjectSummary,
} from './fleetTypes'

import {
  useConvexAgentsTransformed,
  useConvexHarnessesTransformed,
  useConvexProjectsTransformed,
} from './useConvexData'
import { getSliceConfig } from './dataAdapter'

type ResourceName = 'projects' | 'agents' | 'harnesses' | 'health'

const RESOURCE_NAMES: ResourceName[] = ['projects', 'agents', 'harnesses', 'health']

type LoadState = {
  healthStatus: string
  projects: ProjectSummary[]
  agents: AgentRecord[]
  harnesses: HarnessRecord[]
  projectsLoading: boolean
  projectsError: string | null
  agentsLoading: boolean
  agentsError: string | null
  harnessesLoading: boolean
  harnessesError: string | null
  healthLoading: boolean
  healthError: string | null
}

export type FleetDataState = LoadState & {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  busyAgent: string | null
  busyHarness: string | null
  agentTestResult: AgentTestResult | null
  harnessDiscoveryResult: HarnessDiscoveryResult | null
  refreshProjects: () => Promise<void>
  refreshAgents: () => Promise<void>
  refreshHarnesses: () => Promise<void>
  refreshHealth: () => Promise<void>
  testAgent: (agentName: string) => Promise<void>
  testHarnessDiscovery: (harnessName: string) => Promise<void>
}

function errorDetail(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) return payload.trim()
  if (!payload || typeof payload !== 'object') return null

  const record = payload as { error?: unknown; message?: unknown }
  if (typeof record.error === 'string' && record.error.trim()) return record.error.trim()
  if (typeof record.message === 'string' && record.message.trim()) return record.message.trim()
  if (record.error && typeof record.error === 'object') {
    const nested = record.error as { message?: unknown }
    if (typeof nested.message === 'string' && nested.message.trim()) {
      return nested.message.trim()
    }
  }
  return null
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error.trim()
  return fallback
}

async function requestJson<T>(url: string, resourceLabel: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    let detail: string | null = null
    try {
      detail = errorDetail(await response.json())
    } catch {
      // Some error responses have no JSON body. Use the finite fallback below.
    }
    throw new Error(detail ?? `${resourceLabel} request failed (${response.status})`)
  }
  return (await response.json()) as T
}

/**
 * Loads independently sourced fleet resources and exposes resource-scoped
 * state, retries, and Pi readiness actions.
 * @returns Fleet resource state and actions
 */
export function useFleetData() {
  const mountedRef = useRef(true)
  const resourceGenerations = useRef<Record<ResourceName, number>>({
    projects: 0,
    agents: 0,
    harnesses: 0,
    health: 0,
  })

  const sliceConfig = getSliceConfig()
  const projectsSource = sliceConfig.projects
  const agentsSource = sliceConfig.agents
  const harnessesSource = sliceConfig.harnesses

  const [state, setState] = useState<LoadState>({
    healthStatus: 'Checking...',
    projects: [],
    agents: [],
    harnesses: [],
    projectsLoading: true,
    projectsError: null,
    agentsLoading: true,
    agentsError: null,
    harnessesLoading: true,
    harnessesError: null,
    healthLoading: true,
    healthError: null,
  })
  const [agentTestResult, setAgentTestResult] = useState<AgentTestResult | null>(null)
  const [harnessDiscoveryResult, setHarnessDiscoveryResult] =
    useState<HarnessDiscoveryResult | null>(null)
  const [busyAgent, setBusyAgent] = useState<string | null>(null)
  const [busyHarness, setBusyHarness] = useState<string | null>(null)
  const [convexRefreshKeys, setConvexRefreshKeys] = useState({
    projects: 0,
    agents: 0,
    harnesses: 0,
  })
  const convexLastKnown = useRef<{
    projects: ProjectSummary[]
    agents: AgentRecord[]
    harnesses: HarnessRecord[]
  }>({ projects: [], agents: [], harnesses: [] })

  const setConvexProjectsError = useCallback((error: unknown) => {
    if (!mountedRef.current) return
    const message = formatError(error, 'Project catalog unavailable')
    setState(prev => ({
      ...prev,
      projectsLoading: false,
      projectsError: message,
    }))
  }, [])

  const setConvexAgentsError = useCallback((error: unknown) => {
    if (!mountedRef.current) return
    setState(prev => ({
      ...prev,
      agentsLoading: false,
      agentsError: formatError(error, 'Agent catalog unavailable'),
    }))
  }, [])

  const setConvexHarnessesError = useCallback((error: unknown) => {
    if (!mountedRef.current) return
    setState(prev => ({
      ...prev,
      harnessesLoading: false,
      harnessesError: formatError(error, 'Harness catalog unavailable'),
    }))
  }, [])

  // Convex-backed data (undefined when Convex not configured)
  const convexProjects = useConvexProjectsTransformed(
    setConvexProjectsError,
    convexRefreshKeys.projects,
  )
  const convexAgents = useConvexAgentsTransformed(setConvexAgentsError, convexRefreshKeys.agents)
  const convexHarnesses = useConvexHarnessesTransformed(
    setConvexHarnessesError,
    convexRefreshKeys.harnesses,
  )

  useEffect(() => {
    if (projectsSource !== 'convex' && agentsSource !== 'convex' && harnessesSource !== 'convex') {
      return
    }

    if (projectsSource === 'convex' && convexProjects !== undefined) {
      convexLastKnown.current.projects = convexProjects
    }
    if (agentsSource === 'convex' && convexAgents !== undefined) {
      convexLastKnown.current.agents = convexAgents
    }
    if (harnessesSource === 'convex' && convexHarnesses !== undefined) {
      convexLastKnown.current.harnesses = convexHarnesses
    }

    setState(prev => {
      const next = { ...prev }
      let changed = false

      if (projectsSource === 'convex' && convexProjects !== undefined) {
        if (next.projectsLoading || next.projectsError !== null) {
          next.projectsLoading = false
          next.projectsError = null
          changed = true
        }
      }
      if (agentsSource === 'convex' && convexAgents !== undefined) {
        if (next.agentsLoading || next.agentsError !== null) {
          next.agentsLoading = false
          next.agentsError = null
          changed = true
        }
      }
      if (harnessesSource === 'convex' && convexHarnesses !== undefined) {
        if (next.harnessesLoading || next.harnessesError !== null) {
          next.harnessesLoading = false
          next.harnessesError = null
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [agentsSource, convexAgents, convexHarnesses, convexProjects, harnessesSource, projectsSource])

  const beginResource = useCallback((resource: ResourceName) => {
    const generation = resourceGenerations.current[resource] + 1
    resourceGenerations.current[resource] = generation
    return generation
  }, [])

  const isCurrentResource = useCallback((resource: ResourceName, generation: number) => {
    return mountedRef.current && resourceGenerations.current[resource] === generation
  }, [])

  const refreshProjects = useCallback(async () => {
    if (!mountedRef.current) return
    if (projectsSource === 'convex') {
      setState(prev => ({ ...prev, projectsLoading: true, projectsError: null }))
      setConvexRefreshKeys(prev => ({ ...prev, projects: prev.projects + 1 }))
      return
    }
    const generation = beginResource('projects')
    setState(prev => ({
      ...prev,
      projectsLoading: true,
      projectsError: null,
    }))
    try {
      const projectList = await requestJson<ProjectSummary[]>('/api/projects', 'Project catalog')
      if (!isCurrentResource('projects', generation)) return
      setState(prev => ({
        ...prev,
        projects: projectList,
        projectsLoading: false,
        projectsError: null,
      }))
    } catch (error) {
      if (!isCurrentResource('projects', generation)) return
      const message = formatError(error, 'Project catalog unavailable')
      setState(prev => ({
        ...prev,
        projectsLoading: false,
        projectsError: message,
      }))
    }
  }, [beginResource, isCurrentResource, projectsSource])

  const refreshAgents = useCallback(async () => {
    if (!mountedRef.current) return
    if (agentsSource === 'convex') {
      setState(prev => ({ ...prev, agentsLoading: true, agentsError: null }))
      setConvexRefreshKeys(prev => ({ ...prev, agents: prev.agents + 1 }))
      return
    }
    const generation = beginResource('agents')
    setState(prev => ({ ...prev, agentsLoading: true, agentsError: null }))
    try {
      const agentList = await requestJson<AgentRecord[]>('/api/agents', 'Agent catalog')
      if (!isCurrentResource('agents', generation)) return
      setState(prev => ({ ...prev, agents: agentList, agentsLoading: false, agentsError: null }))
    } catch (error) {
      if (!isCurrentResource('agents', generation)) return
      setState(prev => ({
        ...prev,
        agentsLoading: false,
        agentsError: formatError(error, 'Agent catalog unavailable'),
      }))
    }
  }, [agentsSource, beginResource, isCurrentResource])

  const refreshHarnesses = useCallback(async () => {
    if (!mountedRef.current) return
    if (harnessesSource === 'convex') {
      setState(prev => ({ ...prev, harnessesLoading: true, harnessesError: null }))
      setConvexRefreshKeys(prev => ({ ...prev, harnesses: prev.harnesses + 1 }))
      return
    }
    const generation = beginResource('harnesses')
    setState(prev => ({ ...prev, harnessesLoading: true, harnessesError: null }))
    try {
      const harnessList = await requestJson<HarnessRecord[]>('/api/harnesses', 'Harness catalog')
      if (!isCurrentResource('harnesses', generation)) return
      setState(prev => ({
        ...prev,
        harnesses: harnessList,
        harnessesLoading: false,
        harnessesError: null,
      }))
    } catch (error) {
      if (!isCurrentResource('harnesses', generation)) return
      setState(prev => ({
        ...prev,
        harnessesLoading: false,
        harnessesError: formatError(error, 'Harness catalog unavailable'),
      }))
    }
  }, [beginResource, harnessesSource, isCurrentResource])

  const refreshHealth = useCallback(async () => {
    if (!mountedRef.current) return
    const generation = beginResource('health')
    setState(prev => ({ ...prev, healthLoading: true, healthError: null }))
    try {
      const health = await requestJson<ApiStatus>('/api/health', 'Backend health')
      if (!isCurrentResource('health', generation)) return
      setState(prev => ({
        ...prev,
        healthStatus: `Backend Status: ${health.message}`,
        healthLoading: false,
        healthError: null,
      }))
    } catch (error) {
      if (!isCurrentResource('health', generation)) return
      const message = formatError(error, 'Backend health unavailable')
      setState(prev => ({
        ...prev,
        healthLoading: false,
        healthError: message,
        healthStatus: `Backend Error: ${message}`,
      }))
    }
  }, [beginResource, isCurrentResource])

  const refresh = useCallback(async () => {
    await Promise.all([refreshHealth(), refreshProjects(), refreshAgents(), refreshHarnesses()])
  }, [refreshAgents, refreshHarnesses, refreshHealth, refreshProjects])

  useEffect(() => {
    mountedRef.current = true

    void Promise.all([
      refreshHealth(),
      projectsSource === 'bun' ? refreshProjects() : Promise.resolve(),
      agentsSource === 'bun' ? refreshAgents() : Promise.resolve(),
      harnessesSource === 'bun' ? refreshHarnesses() : Promise.resolve(),
    ])

    return () => {
      mountedRef.current = false
      for (const resource of RESOURCE_NAMES) {
        resourceGenerations.current[resource] += 1
      }
    }
  }, [
    agentsSource,
    harnessesSource,
    projectsSource,
    refreshAgents,
    refreshHarnesses,
    refreshHealth,
    refreshProjects,
  ])

  const testAgent = useCallback(async (agentName: string) => {
    setBusyAgent(agentName)
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(agentName)}/test`, {
        method: 'POST',
      })
      const payload = (await response.json()) as AgentTestResult
      const ready =
        response.ok &&
        payload.ok !== false &&
        !payload.error &&
        payload.readiness?.ok !== false &&
        (payload.status === 'ready' || payload.status === 'success')
      setAgentTestResult({
        name: agentName,
        ok: ready,
        status: ready ? 'ready' : 'blocked',
        latencyMs: payload.latencyMs,
        output: ready ? payload.output : '',
        error: ready
          ? undefined
          : (payload.error ?? payload.readiness?.reason ?? 'Pi readiness check failed'),
        readiness: payload.readiness,
      })
    } catch (testError) {
      const message = testError instanceof Error ? testError.message : 'Unknown error'
      setAgentTestResult({
        name: agentName,
        status: 'failed',
        latencyMs: 0,
        output: '',
        error: message,
      })
    } finally {
      setBusyAgent(null)
    }
  }, [])

  const testHarnessDiscovery = useCallback(async (harnessName: string) => {
    setBusyHarness(harnessName)
    try {
      const response = await fetch(`/api/harnesses/${encodeURIComponent(harnessName)}/models`)
      const payload = (await response.json()) as { models?: string[]; error?: string }
      setHarnessDiscoveryResult({
        name: harnessName,
        models: payload.models ?? [],
        error: payload.error,
      })
    } catch (discoveryError) {
      const message = discoveryError instanceof Error ? discoveryError.message : 'Unknown error'
      setHarnessDiscoveryResult({
        name: harnessName,
        models: [],
        error: message,
      })
    } finally {
      setBusyHarness(null)
    }
  }, [])

  return {
    ...state,
    // Overlay Convex data when the configured source has delivered it.
    projects:
      projectsSource === 'convex'
        ? (convexProjects ?? convexLastKnown.current.projects)
        : state.projects,
    agents:
      agentsSource === 'convex' ? (convexAgents ?? convexLastKnown.current.agents) : state.agents,
    harnesses:
      harnessesSource === 'convex'
        ? (convexHarnesses ?? convexLastKnown.current.harnesses)
        : state.harnesses,
    projectsLoading: state.projectsLoading,
    agentsLoading: state.agentsLoading,
    harnessesLoading: state.harnessesLoading,
    loading: state.projectsLoading,
    error: state.projectsError ?? state.agentsError ?? state.harnessesError ?? state.healthError,
    refresh,
    refreshProjects,
    refreshAgents,
    refreshHarnesses,
    refreshHealth,
    busyAgent,
    busyHarness,
    agentTestResult,
    harnessDiscoveryResult,
    testAgent,
    testHarnessDiscovery,
  }
}
