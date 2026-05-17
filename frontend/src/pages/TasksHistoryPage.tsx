import { useState } from 'react'
import { useTaskHistory } from '@/hooks/useSprintHistory'
import { TaskHistoryTable } from '@/components/history/TaskHistoryTable'
import { TaskDetailView } from '@/components/history/TaskDetailView'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { TaskHistoryItem } from '@/__fixtures__/historyFixtures'

export function TasksHistoryPage() {
  const tasks = useTaskHistory()
  const [selectedTask, setSelectedTask] = useState<TaskHistoryItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredTasks = (tasks ?? []).filter(task => {
    const matchesSearch = searchQuery
      ? task.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true
    const matchesStatus = statusFilter ? task.status === statusFilter : true
    return matchesSearch && matchesStatus
  })

  if (tasks === undefined) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Task History</h1>
        <div className="py-12 text-center text-muted-foreground">Loading task history…</div>
      </section>
    )
  }

  if (tasks.length === 0) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Task History</h1>
        <div className="py-12 text-center text-muted-foreground">No task history</div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Task History</h1>

      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border-2 border-border rounded-md bg-card"
          aria-label="Search tasks"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 border-2 border-border rounded-md bg-card"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="done">done</option>
          <option value="in_progress">in_progress</option>
          <option value="todo">todo</option>
        </select>
        <select
          className="px-4 py-2 border-2 border-border rounded-md bg-card"
          aria-label="Filter by project"
        >
          <option value="">All Projects</option>
        </select>
        <select
          className="px-4 py-2 border-2 border-border rounded-md bg-card"
          aria-label="Filter by agent"
        >
          <option value="">All Agents</option>
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <TaskHistoryTable
            tasks={filteredTasks}
            onSelectTask={setSelectedTask}
          />
        </div>

        <div>
          <TaskDetailView
            task={selectedTask}
            onBack={selectedTask ? () => setSelectedTask(null) : undefined}
          />
        </div>
      </div>
    </section>
  )
}