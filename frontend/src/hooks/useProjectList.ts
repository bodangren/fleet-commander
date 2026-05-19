import { useState, useEffect } from 'react'

export type Project = {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

export function useProjectList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/projects')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`)
        return res.json() as Promise<Project[]>
      })
      .then(data => {
        if (!cancelled) {
          setProjects(data)
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { projects, loading, error }
}
