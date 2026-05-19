import type {
  TimelineTask,
  TimelineAgent,
  TimelineSprint,
  TimelineProject,
} from '@/hooks/useTaskTimeline'

interface TaskInfoBarProps {
  task: TimelineTask
  agents: TimelineAgent[]
  sprint: TimelineSprint | null
  project: TimelineProject | null
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  backlog: { bg: '#141516', color: '#8a8f98' },
  ready: { bg: 'rgba(94,106,210,0.15)', color: '#5e6ad2' },
  in_progress: { bg: 'rgba(94,106,210,0.15)', color: '#5e6ad2' },
  review: { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
  done: { bg: 'rgba(39,166,68,0.15)', color: '#27a644' },
  blocked: { bg: 'rgba(235,61,84,0.15)', color: '#eb3d54' },
}

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export function TaskInfoBar({ task, agents, sprint, project }: TaskInfoBarProps) {
  const assignee = agents.find(a => a._id === task.assigneeId)
  const badge = STATUS_BADGE[task.status] ?? STATUS_BADGE.backlog

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px',
        padding: '14px 16px',
        background: '#0f1011',
        border: '1px solid #23252a',
        borderRadius: '8px',
      }}
      data-testid="task-info-bar"
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#f7f8f8' }}>
          {assignee ? (
            <>
              Assignee:{' '}
              <span style={{ color: '#5e6ad2' }}>
                @{assignee.name} ({assignee.role})
              </span>
            </>
          ) : (
            'Assignee: Unassigned'
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#8a8f98', marginTop: '2px' }}>
          Priority: {PRIORITY_LABEL[task.priority] ?? task.priority}
          {sprint ? ` · ${sprint.name}` : ''}
          {project ? ` · ${project.name}` : ''}
        </div>
      </div>
      <span
        style={{
          display: 'inline-flex',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 500,
          background: badge.bg,
          color: badge.color,
        }}
        data-testid="task-status-badge"
      >
        {task.status.replace('_', ' ')}
      </span>
    </div>
  )
}
