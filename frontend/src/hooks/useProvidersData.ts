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

      const rawAgents = (await agentsRes.json()) as Array<
        | AgentInfo
        | {
            definition?: { name?: string; description?: string; model?: string }
            name?: string
            displayName?: string
            model?: string
          }
      >
      const normalizedAgents = Array.isArray(rawAgents)
        ? rawAgents.map(item => {
            const def = (
              item as { definition?: { name?: string; description?: string; model?: string } }
            ).definition
            return {
              name: def?.name ?? (item as AgentInfo).name ?? 'unknown',
              displayName:
                def?.description ??
                (item as AgentInfo).displayName ??
                def?.name ??
                (item as AgentInfo).name ??
                'unknown',
              model: def?.model ?? (item as AgentInfo).model ?? '',
            }
          })
        : []
      setAgents(normalizedAgents)

      if (providersRes.ok) {
        const rawData = (await providersRes.json()) as Array<
          ProviderInfo | { definition?: { name?: string }; name?: string; models?: string[] }
        >
        const normalized = Array.isArray(rawData)
          ? rawData.map(item => ({
              name:
                (item as ProviderInfo).name ??
                (item as { definition?: { name?: string } }).definition?.name ??
                'unknown',
              models: (item as ProviderInfo).models ?? [],
            }))
          : []
        setProviders(normalized)
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
