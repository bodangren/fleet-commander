import { useEffect, useState } from 'react'

export interface ProviderHealthInfo {
  _id: string
  name: string
  models: string[]
  status: string
  latency?: number
  avgLatencyMs?: number
  failureCount?: number
  lastCheckedAt?: number
  lastSuccessAt?: number
  baseUrl?: string
  createdAt: number
}

export interface FallbackEventInfo {
  _id: string
  taskKey: string
  fallbackFrom: string
  fallbackTo: string
  fallbackReason: string
  attemptNumber: number
  createdAt: number
}

/**
 * Loads provider health data and fallback history from the pivot API.
 * Returns providers with health status, latency history, and fallback events.
 */
export function useProviderHealth() {
  const [providers, setProviders] = useState<ProviderHealthInfo[]>([])
  const [fallbackEvents, setFallbackEvents] = useState<FallbackEventInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (signal?: AbortSignal) => {
    try {
      const [providersRes, fallbacksRes] = await Promise.all([
        fetch('/api/providers/health', { signal }),
        fetch('/api/providers/fallbacks', { signal }),
      ])

      if (providersRes.ok) {
        const data = (await providersRes.json()) as ProviderHealthInfo[]
        setProviders(Array.isArray(data) ? data : [])
      } else {
        setProviders([])
      }

      if (fallbacksRes.ok) {
        const data = (await fallbacksRes.json()) as FallbackEventInfo[]
        setFallbackEvents(Array.isArray(data) ? data : [])
      } else {
        setFallbackEvents([])
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
    fallbackEvents,
    loading,
    error,
    refresh,
  }
}
