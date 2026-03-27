import { useEffect, useRef, useState } from 'react'

export interface WebSocketLine {
  type: string
  content: string
}

export function useWebSocket(projectId: string) {
  const [lines, setLines] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!projectId) {
      setLines([])
      setConnected(false)
      return
    }

    setLines([])

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/projects/${projectId}/ws`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data as string) as WebSocketLine
        if (data.content) {
          setLines(prev => [...prev, data.content])
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

  return { lines, connected, clearLines, wsRef }
}
