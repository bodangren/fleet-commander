const COLORS = {
  cardBg: '#0f1011',
  border: '#23252a',
  cardInner: '#141516',
  textPrimary: '#f7f8f8',
  textMuted: '#8a8f98',
  textDim: '#62666d',
  accent: '#5e6ad2',
  success: '#27a644',
  danger: '#eb3d54',
}

/**
 * Get status color
 * @param status - The agent status
 * @returns Color hex string for the status
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'done':
    case 'completed':
    case 'active':
      return COLORS.success
    case 'blocked':
    case 'failed':
      return COLORS.danger
    case 'running':
    case 'in_progress':
      return COLORS.accent
    case 'idle':
      return COLORS.textDim
    default:
      return COLORS.textMuted
  }
}

/**
 * Get initials
 * @param name - The name to get initials from
 * @returns Two-letter uppercase initials
 */
function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

export interface AgentStatusAgent {
  _id: string
  name: string
  role: string
  status: string
}

export interface AgentStatusTask {
  _id: string
  title: string
  assigneeId?: string
}

/**
 * Renders a status indicator
 * @param agents - Array of agent objects
 * @param tasks - Array of task objects
 */
export function AgentStatus({
  agents,
  tasks,
}: {
  agents: AgentStatusAgent[]
  tasks: AgentStatusTask[]
}) {
  const activeAgents = agents.filter(a => a.status === 'active')
  const idleAgents = agents.filter(a => a.status === 'idle')

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.cardBg,
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
          Agent Status
        </h3>
        <span style={{ fontSize: 11, color: COLORS.textMuted }}>
          {activeAgents.length} active · {idleAgents.length} idle ·{' '}
          {agents.filter(a => a.status === 'blocked').length} blocked
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {agents.map(agent => {
          const assignedTask = tasks.find(t => t.assigneeId === agent._id)
          const statusColor = getStatusColor(agent.status)
          return (
            <div
              key={agent._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: COLORS.cardInner,
                borderRadius: 8,
                padding: 10,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: COLORS.cardBg,
                  border: `1px solid ${COLORS.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.accent,
                  flexShrink: 0,
                }}
              >
                {getInitials(agent.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                  @{agent.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: COLORS.textMuted,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {agent.role}
                  {assignedTask && ` · ${assignedTask.title}`}
                </div>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 500,
                  background: `${statusColor}22`,
                  color: statusColor,
                  flexShrink: 0,
                }}
              >
                {agent.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
