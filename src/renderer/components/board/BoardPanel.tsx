import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { BoardView } from './BoardView'
import type { BoardTask } from '../../../shared/board'

interface BoardPanelProps {
  tasks: BoardTask[]
  isLoading?: boolean
  error?: string | null
  onRefresh: () => void
}

const ALL_OPTION = 'all'

export function BoardPanel({ tasks, isLoading = false, error = null, onRefresh }: BoardPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTrackId, setSelectedTrackId] = useState(ALL_OPTION)
  const [selectedPhase, setSelectedPhase] = useState(ALL_OPTION)

  const trackOptions = useMemo(() => {
    const seen = new Map<string, string>()
    tasks.forEach(task => {
      if (!seen.has(task.trackId)) {
        seen.set(task.trackId, task.trackTitle)
      }
    })
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }))
  }, [tasks])

  const phaseOptions = useMemo(() => {
    const phases = new Set<string>()
    tasks.forEach(task => {
      if (selectedTrackId === ALL_OPTION || task.trackId === selectedTrackId) {
        phases.add(task.phase)
      }
    })
    return Array.from(phases.values())
  }, [tasks, selectedTrackId])

  useEffect(() => {
    setSelectedPhase(ALL_OPTION)
  }, [selectedTrackId])

  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return tasks.filter(task => {
      if (selectedTrackId !== ALL_OPTION && task.trackId !== selectedTrackId) {
        return false
      }
      if (selectedPhase !== ALL_OPTION && task.phase !== selectedPhase) {
        return false
      }
      if (normalizedQuery.length > 0 && !task.title.toLowerCase().includes(normalizedQuery)) {
        return false
      }
      return true
    })
  }, [tasks, searchQuery, selectedTrackId, selectedPhase])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="board-search">
            Search
          </label>
          <input
            id="board-search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search tasks"
            className="w-56 rounded border border-border bg-background px-3 py-2 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="board-track">
            Track
          </label>
          <select
            id="board-track"
            value={selectedTrackId}
            onChange={event => setSelectedTrackId(event.target.value)}
            className="w-48 rounded border border-border bg-background px-3 py-2 text-xs"
          >
            <option value={ALL_OPTION}>All Tracks</option>
            {trackOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="board-phase">
            Phase
          </label>
          <select
            id="board-phase"
            value={selectedPhase}
            onChange={event => setSelectedPhase(event.target.value)}
            className="w-48 rounded border border-border bg-background px-3 py-2 text-xs"
          >
            <option value={ALL_OPTION}>All Phases</option>
            {phaseOptions.map(phase => (
              <option key={phase} value={phase}>
                {phase}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          Refresh Board
        </Button>
      </div>
      <BoardView tasks={filteredTasks} isLoading={isLoading} error={error} />
    </section>
  )
}
