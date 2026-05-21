const COLORS = {
  cardBg: '#0f1011',
  border: '#23252a',
  textPrimary: '#f7f8f8',
  textMuted: '#8a8f98',
  accent: '#5e6ad2',
  success: '#27a644',
  danger: '#eb3d54',
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getAgentName(
  agentId: string | undefined,
  agents: { _id: string; name: string }[],
): string {
  if (!agentId) return 'System'
  const agent = agents.find(a => a._id === agentId)
  return agent ? `@${agent.name}` : 'Unknown'
}

export interface RecentActivityRun {
  _id: string
  taskId: string
  stage: string
  agentId?: string
  startTime: number
  cost?: number
  status: string
}

export interface RecentActivityTask {
  _id: string
  title: string
}

export interface RecentActivityAgent {
  _id: string
  name: string
}

export function RecentActivity({
  pipelineRuns,
  tasks,
  agents,
}: {
  pipelineRuns: RecentActivityRun[]
  tasks: RecentActivityTask[]
  agents: RecentActivityAgent[]
}) {
  const recentActivity = [...pipelineRuns].sort((a, b) => b.startTime - a.startTime).slice(0, 6)

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.cardBg,
        padding: 24,
      }}
    >
      <h3
        style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary, margin: '0 0 16px 0' }}
      >
        Recent Activity
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {recentActivity.length === 0 && (
          <div style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: 12 }}>
            No recent activity
          </div>
        )}
        {recentActivity.map(run => {
          const task = tasks.find(t => t._id === run.taskId)
          const agentName = getAgentName(run.agentId, agents)
          const runColor =
            run.status === 'completed'
              ? COLORS.success
              : run.status === 'failed'
                ? COLORS.danger
                : COLORS.accent
          const icon = run.status === 'completed' ? '✓' : run.status === 'failed' ? '⊘' : '→'

          return (
            <div key={run._id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  background: `${runColor}22`,
                  color: runColor,
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: COLORS.textPrimary }}>
                  <span style={{ color: COLORS.accent }}>{agentName}</span> {run.stage} {run.status}
                  {task && ` "${task.title}"`}
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                  {run.cost ? `${run.cost.toFixed(2)} pts` : ''}
                  {run.cost && ' · '}
                  {formatTimeAgo(run.startTime)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
