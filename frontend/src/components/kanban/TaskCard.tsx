import React from 'react'
import { formatDuration } from '@/lib/formatDuration'
import type { KanbanTask } from '@/hooks/useKanbanBoard'

export type TaskCardProps = {
  task: KanbanTask
  isDragging?: boolean
  isPending?: boolean
  onClick?: () => void
  onUnblock?: (taskId: string) => void
}

/**
 * Formats a number as USD currency string
 */
function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`
}

/**
 * Returns badge config for task priority display
 */
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

/**
 * Returns badge config for pipeline stage display
 */
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

/**
 * Returns CSS class for left border color based on task status and blocked state
 */
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

/**
 * Renders a small agent chain indicator showing assignee, reviewer, and merger initials
 */
function AgentChain({
  assigneeName,
  reviewerName,
  mergerName,
}: {
  assigneeName?: string
  reviewerName?: string
  mergerName?: string
}) {
  const chain = [
    assigneeName && { label: 'Ex', name: assigneeName, color: '#5e6ad2' },
    reviewerName && { label: 'Re', name: reviewerName, color: '#27a644' },
    mergerName && { label: 'Me', name: mergerName, color: '#8a8f98' },
  ].filter(Boolean) as Array<{ label: string; name: string; color: string }>

  if (chain.length <= 1) return null

  return (
    <div className="flex items-center gap-1 mt-1.5">
      {chain.map((agent, i) => (
        <div key={agent.label} className="flex items-center gap-1">
          {i > 0 && <span className="text-[10px] text-[#62666d]">→</span>}
          <span
            className="text-[10px] font-medium px-1 py-0.5 rounded"
            style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
            title={agent.name}
          >
            {agent.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export const TaskCard = React.memo(function TaskCard({
  task,
  isDragging,
  isPending,
  onClick,
  onUnblock,
}: TaskCardProps) {
  const prio = priorityBadge(task.priority)
  const stage = pipelineStageBadge(task.status)
  const isDone = task.status === 'done'
  const isBlocked = task.status === 'blocked'
  const isInProgress = task.status === 'in_progress'

  const costDisplay = task.actualCost
    ? `${formatCurrency(task.actualCost)}`
    : `est. ${formatCurrency(task.costEstimate)}`

  return (
    <div
      role="listitem"
      aria-label={`${task.title}, ${task.priority} priority, ${task.status.replace('_', ' ')}`}
      data-task-id={task._id}
      draggable
      onDragStart={e => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', task._id)
          e.dataTransfer.effectAllowed = 'move'
        }
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
        {isInProgress && task.durationMs && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[rgba(94,106,210,0.15)] text-[#5e6ad2]">
            {formatDuration(task.durationMs)}
          </span>
        )}
      </div>

      {isBlocked && task.blockerReason && (
        <div className="text-[11px] text-[#eab308] mb-2 leading-snug">{task.blockerReason}</div>
      )}

      <div className="text-xs text-[#8a8f98] font-mono mb-2">
        {task.storyPoints} pts · {costDisplay}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#5e6ad2]">
          {task.assigneeName ? `@${task.assigneeName}` : 'Unassigned'}
        </span>
        {isBlocked && onUnblock && (
          <button
            type="button"
            aria-label={`Unblock task ${task.title}`}
            onClick={e => {
              e.stopPropagation()
              onUnblock(task._id)
            }}
            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#141516] border border-[#23252a] text-[#d0d6e0] hover:bg-[#18191a] hover:text-[#f7f8f8] transition-colors"
          >
            Unblock
          </button>
        )}
      </div>

      {isDone && (
        <AgentChain
          assigneeName={task.assigneeName}
          reviewerName={task.reviewerName}
          mergerName={task.mergerName}
        />
      )}
    </div>
  )
})
