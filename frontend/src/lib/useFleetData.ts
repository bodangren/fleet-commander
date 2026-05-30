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
  useConvexProjectsTransformed,
  useConvexAgentsTransformed,
  useConvexHarnessesTransformed,
} from './useConvexData'

type LoadState = {
  healthStatus: string
  projects: ProjectSummary[]
  agents: AgentRecord[]
  harnesses: HarnessRecord[]
  loading: boolean
  error: string | null
}

export type FleetDataState = LoadState & {
  refresh: () => Promise<void>
  busyAgent: string | null
  busyHarness: string | null
  agentTestResult: AgentTestResult | null
  harnessDiscoveryResult: HarnessDiscoveryResult | null
  testAgent: (agentName: string) => Promise<void>
  testHarnessDiscovery: (harnessName: string) => Promise<void>
}

/**
 * React hook fleet data
 */
export function useFleetData() {
  const mountedRef = useRef(true)

  // Convex-backed data (undefined when Convex not configured)
  const convexProjects = useConvexProjectsTransformed()
  const convexAgents = useConvexAgentsTransformed()
  const convexHarnesses = useConvexHarnessesTransformed()

  // Bun server API state
  const [state, setState] = useState<LoadState>({
    healthStatus: 'Checking...',
    projects: [],
    agents: [],
    harnesses: [],
    loading: true,
    error: null,
  })
  const [agentTestResult, setAgentTestResult] = useState<AgentTestResult | null>(null)
  const [harnessDiscoveryResult, setHarnessDiscoveryResult] =
    useState<HarnessDiscoveryResult | null>(null)
  const [busyAgent, setBusyAgent] = useState<string | null>(null)
  const [busyHarness, setBusyHarness] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))

    try {
      await fetch('/api/projects/scan-and-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const [healthRes, projectsRes, agentsRes, harnessesRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/projects'),
        fetch('/api/agents'),
        fetch('/api/harnesses'),
      ])

      if (!healthRes.ok || !projectsRes.ok || !agentsRes.ok || !harnessesRes.ok) {
        throw new Error('Failed to load one or more API resources')
      }

      const [health, projectList, agentList, harnessList] = await Promise.all([
        healthRes.json() as Promise<ApiStatus>,
        projectsRes.json() as Promise<ProjectSummary[]>,
        agentsRes.json() as Promise<AgentRecord[]>,
        harnessesRes.json() as Promise<HarnessRecord[]>,
      ])

      if (!mountedRef.current) {
        return
      }

      setState({
        healthStatus: `Backend Status: ${health.message}`,
        projects: projectList,
        agents: agentList,
        harnesses: harnessList,
        loading: false,
        error: null,
      })
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown error'
      if (!mountedRef.current) {
        return
      }
      setState(prev => ({
        ...prev,
        loading: false,
        error: message,
        healthStatus: `Backend Error: ${message}`,
      }))
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    void (async () => {
      await refresh()
    })()

    return () => {
      mountedRef.current = false
    }
  }, [refresh])

  const testAgent = useCallback(async (agentName: string) => {
    setBusyAgent(agentName)
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(agentName)}/test`, {
        method: 'POST',
      })
      const payload = (await response.json()) as AgentTestResult
      setAgentTestResult({
        name: agentName,
        status: payload.status,
        latencyMs: payload.latencyMs,
        output: payload.output,
        error: payload.error,
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
    // Overlay Convex data when available
    projects: convexProjects ?? state.projects,
    agents: convexAgents ?? state.agents,
    harnesses: convexHarnesses ?? state.harnesses,
    // Loading is true if either source is loading (Bun server is loading, Convex is undefined = still loading)
    loading:
      state.loading ||
      (convexProjects === undefined &&
        convexAgents === undefined &&
        convexHarnesses === undefined &&
        state.projects.length === 0),
    refresh,
    busyAgent,
    busyHarness,
    agentTestResult,
    harnessDiscoveryResult,
    testAgent,
    testHarnessDiscovery,
  }
}
