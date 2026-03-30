import { useCallback, useEffect, useRef, useState } from 'react'

import type { ExecutionStatus } from '@/lib/fleetTypes'

export interface WebSocketLine {
  type: string
  content: string
}

export function useWebSocket(projectId: string) {
  const [lines, setLines] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [executionStatuses, setExecutionStatuses] = useState<
    Map<string, ExecutionStatus>
  >(new Map())
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!projectId) {
      setLines([])
      setConnected(false)
      return
    }

    setLines([])
    setExecutionStatuses(new Map())

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

        // Handle execution status events
        if (data.type === 'execution_status') {
          const status = data as ExecutionStatus
          setExecutionStatuses(prev => {
            const next = new Map(prev)
            if (
              status.status === 'succeeded' ||
              status.status === 'failed'
            ) {
              // Keep final status briefly, will be cleared after timeout
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

        // Handle output lines
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
    }

    ws.onerror = () => {
      setConnected(false)
    }

    return () => {
      ws.close()
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
