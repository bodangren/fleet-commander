type TaskStatusBadgeProps = {
  status: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  backlog: { label: 'BACKLOG', className: 'bg-[#141516] text-[#8a8f98]' },
  ready: { label: 'READY', className: 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6]' },
  in_progress: { label: 'IN PROGRESS', className: 'bg-[rgba(94,106,210,0.15)] text-[#5e6ad2]' },
  review: { label: 'REVIEW', className: 'bg-[rgba(39,166,68,0.15)] text-[#27a644]' },
  done: { label: 'DONE', className: 'bg-[rgba(39,166,68,0.15)] text-[#27a644]' },
  blocked: { label: 'BLOCKED', className: 'bg-[rgba(234,179,8,0.15)] text-[#eab308]' },
}

/**
 * Badge component that renders a task status with distinct visual treatment per status
 */
export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.backlog

  return (
    <span
      data-status={status}
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${config.className}`}
    >
      {config.label}
    </span>
  )
}
