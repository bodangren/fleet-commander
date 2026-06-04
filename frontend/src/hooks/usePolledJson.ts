import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Generic polling hook that fetches JSON from a URL at a fixed interval.
 * @param url - endpoint URL to poll (pass null to skip)
 * @param pollMs - polling interval in milliseconds
 */
export function usePolledJson<T>(
  url: string | null,
  pollMs: number,
): {
  data: T | null
  error: string | null
  loading: boolean
  refresh: () => Promise<void>
} {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!url) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
      const json = (await res.json()) as T
      if (mountedRef.current) {
        setData(json)
        setError(null)
        setLoading(false)
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Unknown error')
        setLoading(false)
      }
    }
  }, [url])

  useEffect(() => {
    mountedRef.current = true
    if (!url) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    void refresh()
    const interval = setInterval(() => void refresh(), pollMs)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [refresh, pollMs, url])

  return { data, error, loading, refresh }
}
