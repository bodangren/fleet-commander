import { useState, useMemo } from 'react'
import { useTaskHistory } from '@/hooks/useSprintHistory'
import { useHistoryFilters } from '@/hooks/useHistoryFilters'
import { HistorySearchBar } from '@/components/history/HistorySearchBar'
import { HistoryFilterBar } from '@/components/history/HistoryFilterBar'
import { TaskHistoryTable } from '@/components/history/TaskHistoryTable'
import { TaskDetailView } from '@/components/history/TaskDetailView'
import type { TaskHistoryItem } from '@/__fixtures__/historyFixtures'

export function TasksHistoryPage() {
  const tasks = useTaskHistory()
  const { filters, setSearch, setStatus, setProject, setAgent } = useHistoryFilters()
  const [selectedTask, setSelectedTask] = useState<TaskHistoryItem | null>(null)

  const filteredTasks = useMemo(() => {
    return (tasks ?? []).filter(task => {
      const matchesSearch =
        !filters.search || task.title.toLowerCase().includes(filters.search.toLowerCase())
      const matchesStatus = !filters.status || task.status === filters.status
      const matchesProject = !filters.project || task.projectSlug === filters.project
      const matchesAgent = !filters.agent || task.agent === filters.agent
      return matchesSearch && matchesStatus && matchesProject && matchesAgent
    })
  }, [tasks, filters])

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
        <HistorySearchBar
          value={filters.search ?? ''}
          onChange={setSearch}
          aria-label="Search tasks"
        />
        <HistoryFilterBar
          filters={filters}
          onChange={updated => {
            if (updated.status !== undefined) setStatus(updated.status)
            if (updated.project !== undefined) setProject(updated.project)
            if (updated.agent !== undefined) setAgent(updated.agent)
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <TaskHistoryTable tasks={filteredTasks} onSelectTask={setSelectedTask} />
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
