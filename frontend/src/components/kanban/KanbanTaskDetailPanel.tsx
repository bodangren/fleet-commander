import { DependencyEditor } from './DependencyEditor'
import type { KanbanTask } from '@/hooks/useKanbanBoard'

type Dependency = {
  taskKey: string
  title: string
  status: string
  storyPoints: number
}

type KanbanTaskDetailPanelProps = {
  task: KanbanTask
  dependencies: Dependency[]
  allTasks: KanbanTask[]
  onAddDependency: (dependencyKey: string) => Promise<{ ok: boolean; error?: string }>
  onRemoveDependency: (dependencyKey: string) => Promise<{ ok: boolean; error?: string }>
}

/**
 * Side panel showing task details with integrated dependency management
 */
export function KanbanTaskDetailPanel({
  task,
  dependencies,
  allTasks,
  onAddDependency,
  onRemoveDependency,
}: KanbanTaskDetailPanelProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-[#f7f8f8]">{task.title}</h3>
        <span className="text-[11px] font-mono text-[#62666d] shrink-0">{task.taskKey}</span>
      </div>

      <DependencyEditor
        taskKey={task.taskKey}
        dependencies={dependencies}
        allTasks={allTasks}
        onAdd={onAddDependency}
        onRemove={onRemoveDependency}
      />
    </div>
  )
}
