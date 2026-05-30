import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Sprint {
  id: string
  name: string
  goal: string
  startDate: string
  endDate: string
  status: string
  taskIds: string[]
}

/**
 * Sprint management panel component
 * @param projectId - The project ID to manage sprints for
 */
export function SprintPanel({ projectId }: { projectId: string }) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/sprints`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch sprints')
        return r.json()
      })
      .then(data => setSprints(data.sprints ?? []))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load sprints'))
  }, [projectId])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const sprint = {
      name: form.get('name') as string,
      goal: form.get('goal') as string,
      startDate: form.get('startDate') as string,
      endDate: form.get('endDate') as string,
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/sprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sprint),
      })

      if (!res.ok) {
        throw new Error('Failed to create sprint')
      }

      const created = await res.json()
      setSprints(prev => [...prev, created])
      setShowCreate(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sprint')
    }
  }

  const handleActivate = async (sprintId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/sprints/${sprintId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })

      if (!res.ok) {
        throw new Error('Failed to activate sprint')
      }

      const updated = await res.json()
      setSprints(prev => prev.map(s => (s.id === sprintId ? updated : s)))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate sprint')
    }
  }

  const statusColors: Record<string, string> = {
    planning: 'bg-blue-500/20 text-blue-400',
    active: 'bg-green-500/20 text-green-400',
    completed: 'bg-gray-500/20 text-gray-400',
  }

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium">Sprints</CardTitle>
          <CardDescription>Time-boxed iterations</CardDescription>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          {showCreate ? 'Cancel' : '+ New'}
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded border border-red-500/50 bg-red-500/10 p-2 text-xs text-red-400">
            {error}
          </div>
        )}
        {showCreate && (
          <form onSubmit={handleCreate} className="space-y-2 rounded border border-border/60 p-3">
            <input
              name="name"
              placeholder="Sprint name"
              required
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
            />
            <input
              name="goal"
              placeholder="Sprint goal"
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
            />
            <div className="flex gap-2">
              <input
                name="startDate"
                type="date"
                required
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
              />
              <input
                name="endDate"
                type="date"
                required
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/80"
            >
              Create Sprint
            </button>
          </form>
        )}

        {sprints.length === 0 && !showCreate && (
          <p className="text-sm text-muted-foreground">No sprints yet.</p>
        )}

        {sprints.map(sprint => (
          <div key={sprint.id} className="rounded border border-border/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{sprint.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[sprint.status] ?? ''}`}
              >
                {sprint.status}
              </span>
            </div>
            {sprint.goal && <p className="text-xs text-muted-foreground">{sprint.goal}</p>}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {sprint.startDate} — {sprint.endDate}
              </span>
              <span>{sprint.taskIds?.length ?? 0} tasks</span>
            </div>
            {sprint.status === 'planning' && (
              <button
                onClick={() => handleActivate(sprint.id)}
                className="rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-700"
              >
                Activate
              </button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
