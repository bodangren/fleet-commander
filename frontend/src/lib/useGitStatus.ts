import { useCallback, useEffect, useRef, useState } from 'react'

import type { GitStatus } from './fleetTypes'

type GitDataState = {
  gitStatus: GitStatus | null
  loading: boolean
  error: string | null
}

export type UseGitStatusResult = GitDataState & {
  refresh: () => Promise<void>
}

export function useGitStatus(projectSlug: string | null): UseGitStatusResult {
  const mountedRef = useRef(true)

  const [state, setState] = useState<GitDataState>({
    gitStatus: null,
    loading: true,
    error: null,
  })

  const refresh = useCallback(async () => {
    if (!projectSlug) {
      setState({ gitStatus: null, loading: false, error: null })
      return
    }

    setState(prev => ({ ...prev, loading: true }))

    try {
      const response = await fetch(`/api/git/status?project=${encodeURIComponent(projectSlug)}`)

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        throw new Error(errorData.error || 'Failed to fetch git status')
      }

      const status = (await response.json()) as GitStatus

      if (!mountedRef.current) {
        return
      }

      setState({
        gitStatus: status,
        loading: false,
        error: null,
      })
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown error'
      if (!mountedRef.current) {
        return
      }
      setState({
        gitStatus: null,
        loading: false,
        error: message,
      })
    }
  }, [projectSlug])

  useEffect(() => {
    mountedRef.current = true

    void (async () => {
      await refresh()
    })()

    return () => {
      mountedRef.current = false
    }
  }, [refresh])

  return {
    ...state,
    refresh,
  }
}
