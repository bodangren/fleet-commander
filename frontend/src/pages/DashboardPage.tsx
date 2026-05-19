import { useDashboardData } from '@/hooks/useDashboardData'

const COLORS = {
  bg: '#010102',
  cardBg: '#0f1011',
  cardInner: '#141516',
  border: '#23252a',
  textPrimary: '#f7f8f8',
  textSecondary: '#d0d6e0',
  textMuted: '#8a8f98',
  textDim: '#62666d',
  accent: '#5e6ad2',
  success: '#27a644',
  warning: '#eab308',
  danger: '#eb3d54',
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m`
  return `${mins}m ${seconds % 60}s`
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

function getAgentName(
  agentId: string | undefined,
  agents: { _id: string; name: string }[],
): string {
  if (!agentId) return 'System'
  const agent = agents.find(a => a._id === agentId)
  return agent ? `@${agent.name}` : 'Unknown'
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

export function DashboardPage() {
  const { data, loading, error } = useDashboardData()

  if (loading) {
    return <div style={{ padding: 48, color: COLORS.textMuted }}>Loading dashboard...</div>
  }

  if (error) {
    return <div style={{ padding: 48, color: COLORS.danger }}>Error: {error}</div>
  }

  if (!data) {
    return <div style={{ padding: 48, color: COLORS.textMuted }}>No dashboard data available.</div>
  }

  const { sprint, tasks, agents, pipelineRuns, alerts, metrics } = data

  // Derived values
  const budgetPercent =
    sprint && sprint.budget > 0 ? Math.round((sprint.actualCost / sprint.budget) * 100) : 0
  const blockedTasks = tasks.filter(t => t.status === 'blocked')
  const activeAgents = agents.filter(a => a.status === 'active')
  const idleAgents = agents.filter(a => a.status === 'idle')

  // Recent activity from pipeline runs
  const recentActivity = [...pipelineRuns].sort((a, b) => b.startTime - a.startTime).slice(0, 6)

  return (
    <div style={{ padding: '32px 48px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Sprint Status */}
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.cardBg,
          padding: 24,
          marginBottom: 20,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
              {sprint ? sprint.name : 'No Active Sprint'}
            </h2>
            {sprint && (
              <span
                style={{
                  display: 'inline-flex',
                  padding: '2px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 500,
                  background: 'rgba(94,106,210,0.15)',
                  color: COLORS.accent,
                  textTransform: 'capitalize',
                }}
              >
                {sprint.status}
              </span>
            )}
          </div>
          {sprint && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>Budget</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                <span style={{ color: COLORS.success }}>{formatCurrency(sprint.actualCost)}</span>
                <span style={{ color: COLORS.textDim, fontSize: 16, fontWeight: 400 }}>
                  {' '}
                  / {formatCurrency(sprint.budget)}
                </span>
              </div>
            </div>
          )}
        </div>

        {sprint && (
          <>
            {/* Budget progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  height: 4,
                  background: COLORS.cardInner,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(budgetPercent, 100)}%`,
                    background:
                      budgetPercent > 80
                        ? COLORS.danger
                        : budgetPercent > 60
                          ? COLORS.warning
                          : COLORS.success,
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: COLORS.textMuted,
                  marginTop: 4,
                }}
              >
                <span>{budgetPercent}% spent</span>
                <span>{formatCurrency(sprint.budget - sprint.actualCost)} remaining</span>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div
                style={{
                  background: COLORS.cardInner,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
                  Points Delivered
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary }}>
                  {sprint.pointsDelivered}{' '}
                  <span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 400 }}>
                    / {tasks.reduce((s, t) => s + t.storyPoints, 0)}
                  </span>
                </div>
              </div>
              <div
                style={{
                  background: COLORS.cardInner,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
                  Cost/Point
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.success }}>
                  {sprint.pointsDelivered > 0
                    ? formatCurrency(sprint.actualCost / sprint.pointsDelivered)
                    : '$0.00'}
                </div>
              </div>
              <div
                style={{
                  background: COLORS.cardInner,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
                  Tasks Complete
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary }}>
                  {sprint.completedCount}{' '}
                  <span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 400 }}>
                    / {sprint.taskCount}
                  </span>
                </div>
              </div>
              <div
                style={{
                  background: COLORS.cardInner,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
                  Budget Remaining
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary }}>
                  {formatCurrency(sprint.budget - sprint.actualCost)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Key Metrics + Agent Status */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* Key Metrics */}
        <div
          style={{
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.cardBg,
            padding: 24,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: COLORS.textPrimary,
              margin: '0 0 16px 0',
            }}
          >
            Key Metrics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                label: 'Delivery Rate',
                desc: 'Points per dollar',
                value: metrics.deliveryRate.toFixed(2),
                color: COLORS.success,
              },
              {
                label: 'Success Rate',
                desc: 'First-pass completion',
                value: `${metrics.successRate.toFixed(0)}%`,
                color: metrics.successRate >= 80 ? COLORS.success : COLORS.warning,
              },
              {
                label: 'Avg Pipeline Time',
                desc: 'Dispatch to merge',
                value: formatDuration(metrics.avgPipelineTime),
                color: null,
              },
              {
                label: 'Rejection Rate',
                desc: 'Tasks sent back',
                value: `${metrics.rejectionRate.toFixed(0)}%`,
                color: metrics.rejectionRate <= 10 ? COLORS.success : COLORS.warning,
              },
            ].map(metric => (
              <div
                key={metric.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: COLORS.cardInner,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                    {metric.label}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{metric.desc}</div>
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: metric.color ?? COLORS.textPrimary,
                  }}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Status */}
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
      </div>

      {/* Attention Needed + Recent Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* Attention Needed */}
        <div
          style={{
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.cardBg,
            padding: 24,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: COLORS.textPrimary,
              margin: '0 0 16px 0',
            }}
          >
            Attention Needed
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blockedTasks.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(235,61,84,0.08)',
                  border: '1px solid rgba(235,61,84,0.2)',
                }}
              >
                <div style={{ fontSize: 16 }}>⊘</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                    {blockedTasks.length} task{blockedTasks.length > 1 ? 's' : ''} blocked
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                    {blockedTasks.map(t => t.title).join(', ')}
                  </div>
                </div>
              </div>
            )}

            {sprint && budgetPercent > 60 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(234,179,8,0.08)',
                  border: '1px solid rgba(234,179,8,0.2)',
                }}
              >
                <div style={{ fontSize: 16 }}>!</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                    Budget at {budgetPercent}%
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                    {formatCurrency(sprint.budget - sprint.actualCost)} remaining ·{' '}
                    {sprint.taskCount - sprint.completedCount} tasks left
                  </div>
                </div>
              </div>
            )}

            {alerts.map(alert => {
              const alertColor =
                alert.severity === 'critical'
                  ? COLORS.danger
                  : alert.severity === 'warning'
                    ? COLORS.warning
                    : COLORS.accent
              return (
                <div
                  key={alert._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 8,
                    background: `${alertColor}14`,
                    border: `1px solid ${alertColor}33`,
                  }}
                >
                  <div style={{ fontSize: 16 }}>
                    {alert.severity === 'critical' ? '⊘' : alert.severity === 'warning' ? '!' : '◎'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                      {alert.message}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                      {alert.type} · {formatTimeAgo(alert.createdAt)}
                    </div>
                  </div>
                </div>
              )
            })}

            {blockedTasks.length === 0 &&
              (!sprint || budgetPercent <= 60) &&
              alerts.length === 0 && (
                <div
                  style={{
                    fontSize: 13,
                    color: COLORS.textMuted,
                    padding: 12,
                    textAlign: 'center',
                  }}
                >
                  All clear — no attention items
                </div>
              )}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          style={{
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.cardBg,
            padding: 24,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: COLORS.textPrimary,
              margin: '0 0 16px 0',
            }}
          >
            Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentActivity.length === 0 && (
              <div
                style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: 12 }}
              >
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
                      <span style={{ color: COLORS.accent }}>{agentName}</span> {run.stage}{' '}
                      {run.status}
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
      </div>
    </div>
  )
}
