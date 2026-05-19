import type { Task } from '@/lib/kanban'

import { setKanbanDragState } from './KanbanColumn'

import { cn } from '@/lib/utils'

export type TaskCardPriority = 'low' | 'medium' | 'high'

export type TaskCardProps = {
  task: Task
  onClick: (taskId: string) => void
  assigneeName?: string
}

export function TaskCard({ task, onClick, assigneeName }: TaskCardProps) {
  return (
    <article
      draggable
      data-task-id={task._id}
      onDragStart={() => {
        setKanbanDragState(task._id)
      }}
      onClick={() => onClick(task._id)}
      className="border-2 border-border bg-card p-3 cursor-pointer hover:border-primary transition-colors"
    >
      <h4 className="font-bold text-sm">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs uppercase tracking-wider">{assigneeName ?? 'Unassigned'}</span>
        <span
          className={cn(
            'text-[10px] font-bold uppercase px-2 py-0.5',
            task.priority === 'high'
              ? 'bg-destructive/20 text-destructive'
              : task.priority === 'medium'
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary/20 text-secondary-foreground',
          )}
        >
          {task.priority}
        </span>
      </div>
    </article>
  )
}
