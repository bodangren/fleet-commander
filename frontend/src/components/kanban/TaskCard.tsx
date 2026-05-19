import type { KanbanTask } from '@/hooks/useKanbanBoard'

export type TaskCardProps = {
  task: KanbanTask
  isDragging?: boolean
  isPending?: boolean
  onClick?: () => void
}

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`
}

function priorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return {
        label: 'high',
        className: 'bg-[rgba(235,61,84,0.15)] text-[#eb3d54] border-[rgba(235,61,84,0.3)]',
      }
    case 'medium':
      return {
        label: 'med',
        className: 'bg-[rgba(94,106,210,0.15)] text-[#5e6ad2] border-[rgba(94,106,210,0.3)]',
      }
    default:
      return { label: 'low', className: 'bg-[#141516] text-[#8a8f98] border-[#23252a]' }
  }
}

function pipelineStageBadge(status: string) {
  switch (status) {
    case 'in_progress':
      return { label: 'EXECUTE', className: 'bg-[rgba(94,106,210,0.15)] text-[#5e6ad2]' }
    case 'review':
      return { label: 'REVIEW', className: 'bg-[rgba(39,166,68,0.15)] text-[#27a644]' }
    case 'done':
      return { label: 'MERGED', className: 'bg-[rgba(39,166,68,0.15)] text-[#27a644]' }
    default:
      return null
  }
}

function leftBorderColor(status: string, isBlocked: boolean): string {
  if (isBlocked) return 'border-l-[3px] border-l-[#eab308]'
  switch (status) {
    case 'in_progress':
      return 'border-l-[3px] border-l-[#5e6ad2]'
    case 'review':
      return 'border-l-[3px] border-l-[#27a644]'
    default:
      return ''
  }
}

export function TaskCard({ task, isDragging, isPending, onClick }: TaskCardProps) {
  const prio = priorityBadge(task.priority)
  const stage = pipelineStageBadge(task.status)
  const isDone = task.status === 'done'
  const isBlocked = task.status === 'blocked'

  const costDisplay = task.actualCost
    ? `${formatCurrency(task.actualCost)}`
    : `est. ${formatCurrency(task.costEstimate)}`

  return (
    <div
      data-task-id={task._id}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', task._id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onClick}
      className={`
        bg-[#0f1011] border border-[#23252a] rounded-lg p-3 cursor-grab
        hover:border-[#34343a] transition-all duration-150
        ${leftBorderColor(task.status, isBlocked)}
        ${isDone ? 'opacity-60' : ''}
        ${isDragging ? 'opacity-80 scale-95' : ''}
        ${isPending ? 'opacity-70' : ''}
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium leading-snug text-[#f7f8f8]">{task.title}</h4>
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border shrink-0 ${prio.className}`}
        >
          {prio.label}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        {stage && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${stage.className}`}>
            {stage.label}
          </span>
        )}
        {isBlocked && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[rgba(234,179,8,0.15)] text-[#eab308]">
            BLOCKED
          </span>
        )}
      </div>

      <div className="text-xs text-[#8a8f98] font-mono mb-2">
        {task.storyPoints} pts · {costDisplay}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#5e6ad2]">
          {task.assigneeName ? `@${task.assigneeName}` : 'Unassigned'}
        </span>
      </div>
    </div>
  )
}
