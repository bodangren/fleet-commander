import { useEffect, useState } from 'react'

export type ProviderInfo = {
  name: string
  models: string[]
}

export type AgentInfo = {
  name: string
  displayName: string
  model: string
}

/**
 * Loads LLM providers and agent-model assignments from the pivot API.
 * Returns providers, agents, loading/error flags, and a refresh callback.
 */
export function useProvidersData() {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (signal?: AbortSignal) => {
    try {
      const [agentsRes, providersRes] = await Promise.all([
        fetch('/api/agents', { signal }),
        fetch('/api/harnesses', { signal }),
      ])

      if (!agentsRes.ok) {
        throw new Error('Failed to load agents')
      }

      const agentsData = (await agentsRes.json()) as AgentInfo[]
      setAgents(Array.isArray(agentsData) ? agentsData : [])

      if (providersRes.ok) {
        const providersData = (await providersRes.json()) as ProviderInfo[]
        setProviders(Array.isArray(providersData) ? providersData : [])
      } else {
        setProviders([])
      }
      setError(null)
    } catch (e) {
      if (!signal?.aborted) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void fetchData(controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      await fetchData()
    } finally {
      setLoading(false)
    }
  }

  return {
    providers,
    agents,
    loading,
    error,
    refresh,
  }
}
