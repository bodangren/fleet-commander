import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTaskHistory } from '@/hooks/useSprintHistory'
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout'
import { TaskHistoryTable } from '@/components/history/TaskHistoryTable'
import { TaskDetailView } from '@/components/history/TaskDetailView'
import type { TaskHistoryItem } from '@/__fixtures__/historyFixtures'

/**
 * Task history page component with search/filter controls and task list display
 */
export function TasksHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedTask, setSelectedTask] = useState<TaskHistoryItem | null>(null)

  const data = useTaskHistory()
  const timedOut = useLoadingTimeout(data === undefined)

  const search = searchParams.get('search') ?? ''
  const statusFilter = searchParams.get('status') ?? ''

  const handleSearchChange = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set('search', value)
    } else {
      next.delete('search')
    }
    setSearchParams(next, { replace: true })
  }

  const handleStatusChange = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set('status', value)
    } else {
      next.delete('status')
    }
    setSearchParams(next, { replace: true })
  }

  const handleProjectChange = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set('project', value)
    } else {
      next.delete('project')
    }
    setSearchParams(next, { replace: true })
  }

  const handleAgentChange = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set('agent', value)
    } else {
      next.delete('agent')
    }
    setSearchParams(next, { replace: true })
  }

  if (selectedTask) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Task History</h2>
        </div>
        <TaskDetailView task={selectedTask} onBack={() => setSelectedTask(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Task History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Completed tasks with execution logs and cost breakdown
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search tasks"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="border border-border bg-background px-3 py-1.5 text-sm rounded"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="project-filter" className="text-xs uppercase font-bold sr-only">
            Project
          </label>
          <select
            id="project-filter"
            aria-label="project"
            value={searchParams.get('project') ?? ''}
            onChange={e => handleProjectChange(e.target.value)}
            className="border border-border bg-background px-2 py-1.5 text-sm rounded"
          >
            <option value="">All projects</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="agent-filter" className="text-xs uppercase font-bold sr-only">
            Agent
          </label>
          <select
            id="agent-filter"
            aria-label="agent"
            value={searchParams.get('agent') ?? ''}
            onChange={e => handleAgentChange(e.target.value)}
            className="border border-border bg-background px-2 py-1.5 text-sm rounded"
          >
            <option value="">All agents</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-xs uppercase font-bold sr-only">
            Status
          </label>
          <select
            id="status-filter"
            aria-label="status"
            value={statusFilter}
            onChange={e => handleStatusChange(e.target.value)}
            className="border border-border bg-background px-2 py-1.5 text-sm rounded"
          >
            <option value="">All statuses</option>
            <option value="done">done</option>
            <option value="in_progress">in_progress</option>
            <option value="todo">todo</option>
          </select>
        </div>
      </div>

      {data === null ? (
        <div className="py-12 text-center text-muted-foreground">
          Select a valid project to view task history.
        </div>
      ) : data === undefined ? (
        timedOut ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            Unable to load task history. The backend may be unavailable.
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">Loading task history…</div>
        )
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No task history</div>
      ) : (
        <TaskHistoryTable
          tasks={data.filter(task => {
            const matchesSearch = search
              ? task.title.toLowerCase().includes(search.toLowerCase())
              : true
            const matchesStatus = statusFilter ? task.status === statusFilter : true
            const matchesAgent = searchParams.get('agent')
              ? task.agent === searchParams.get('agent')
              : true
            return matchesSearch && matchesStatus && matchesAgent
          })}
          onSelectTask={setSelectedTask}
        />
      )}
    </div>
  )
}
