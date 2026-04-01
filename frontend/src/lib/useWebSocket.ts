import { useCallback, useEffect, useRef, useState } from 'react'

import type { ExecutionStatus } from '@/lib/fleetTypes'

export interface WebSocketLine {
  type: string
  content: string
}

const DEFAULT_RECONNECT_MS = 5000

export function useWebSocket(projectId: string) {
  const [lines, setLines] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [executionStatuses, setExecutionStatuses] = useState<Map<string, ExecutionStatus>>(
    new Map(),
  )
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectMsRef = useRef(DEFAULT_RECONNECT_MS)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!projectId) {
      setLines([])
      setConnected(false)
      return
    }

    setLines([])
    setExecutionStatuses(new Map())

    // Fetch reconnect interval from settings
    fetch('/api/settings')
      .then(r => r.json())
      .then(cfg => {
        if (cfg?.websocket?.reconnectInterval > 0) {
          reconnectMsRef.current = cfg.websocket.reconnectInterval
        }
      })
      .catch(() => {
        // Use default if settings unavailable
      })

    let cancelled = false

    function connect() {
      if (cancelled || unmountedRef.current) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const url = `${protocol}//${window.location.host}/api/projects/${projectId}/ws`

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
      }

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data as string)

          if (data.type === 'execution_status') {
            const status = data as ExecutionStatus
            setExecutionStatuses(prev => {
              const next = new Map(prev)
              if (status.status === 'succeeded' || status.status === 'failed') {
                next.set(status.taskId, status)
                setTimeout(() => {
                  setExecutionStatuses(current => {
                    const updated = new Map(current)
                    const existing = updated.get(status.taskId)
                    if (existing === status) {
                      updated.delete(status.taskId)
                    }
                    return updated
                  })
                }, 5000)
              } else {
                next.set(status.taskId, status)
              }
              return next
            })
            return
          }

          const line = data as WebSocketLine
          if (line.content) {
            setLines(prev => [...prev, line.content])
          } else {
            setLines(prev => [...prev, event.data as string])
          }
        } catch {
          setLines(prev => [...prev, event.data as string])
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (!cancelled && !unmountedRef.current) {
          reconnectTimerRef.current = setTimeout(connect, reconnectMsRef.current)
        }
      }

      ws.onerror = () => {
        setConnected(false)
        ws.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [projectId])

  const clearLines = () => setLines([])

  const getTaskStatus = useCallback(
    (taskId: string): ExecutionStatus | undefined => {
      return executionStatuses.get(taskId)
    },
    [executionStatuses],
  )

  return { lines, connected, clearLines, wsRef, executionStatuses, getTaskStatus }
}
