import type { PipelineRun, TimelineAgent } from '@/hooks/useTaskTimeline'

interface ExecutionLogProps {
  pipelineRuns: PipelineRun[]
  agents: TimelineAgent[]
}

const STAGES = ['dispatch', 'architect', 'executor', 'reviewer', 'merger'] as const
const STAGE_LABELS: Record<string, string> = {
  dispatch: 'System',
  architect: 'Architect',
  executor: 'Executor',
  reviewer: 'Reviewer',
  merger: 'Merger',
}

/**
 * Formats Unix timestamp as HH:MM:SS string
 */
function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * Returns agent display name or System string
 */
function getAgentName(agentId: string | undefined, agents: TimelineAgent[]): string {
  if (!agentId) return 'System'
  const agent = agents.find(a => a._id === agentId)
  return agent ? `@${agent.name}` : 'System'
}

/**
 * Renders timestamped execution log entries for pipeline stages
 */
export function ExecutionLog({ pipelineRuns, agents }: ExecutionLogProps) {
  const entries: Array<{
    timestamp: number
    stage: string
    agentName: string
    message: string
    type: 'info' | 'success' | 'pending'
  }> = []

  for (const stage of STAGES) {
    const run = pipelineRuns.find(r => r.stage === stage)
    if (!run) {
      entries.push({
        timestamp: Date.now(),
        stage,
        agentName: getAgentName(undefined, agents),
        message: `${stage.charAt(0).toUpperCase() + stage.slice(1)} pending`,
        type: 'pending',
      })
      continue
    }

    entries.push({
      timestamp: run.startTime,
      stage,
      agentName: getAgentName(run.agentId, agents),
      message:
        stage === 'dispatch' ? 'Task dispatched by System' : `${STAGE_LABELS[stage]} stage started`,
      type: 'info',
    })

    if (run.status === 'completed' && run.endTime) {
      entries.push({
        timestamp: run.endTime,
        stage,
        agentName: getAgentName(run.agentId, agents),
        message: `${STAGE_LABELS[stage]} stage completed`,
        type: 'success',
      })
    } else if (run.status === 'failed' && run.endTime) {
      entries.push({
        timestamp: run.endTime,
        stage,
        agentName: getAgentName(run.agentId, agents),
        message: `${STAGE_LABELS[stage]} stage failed`,
        type: 'pending',
      })
    }
  }

  entries.sort((a, b) => a.timestamp - b.timestamp)

  return (
    <div
      style={{
        background: '#0f1011',
        border: '1px solid #23252a',
        borderRadius: '12px',
        padding: '24px',
      }}
      data-testid="execution-log"
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          letterSpacing: '-0.2px',
          marginBottom: '16px',
          color: '#f7f8f8',
        }}
      >
        Execution Log
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
          lineHeight: 1.8,
          color: '#8a8f98',
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {entries.map((entry, i) => (
          <div key={i} data-testid={`log-entry-${i}`}>
            <span style={{ color: '#62666d' }}>[{formatTimestamp(entry.timestamp)}]</span>{' '}
            {entry.agentName !== 'System' ? (
              <span style={{ color: '#5e6ad2' }}>{entry.agentName}</span>
            ) : (
              <span style={{ color: '#62666d' }}>System</span>
            )}{' '}
            <span
              style={{
                color:
                  entry.type === 'success'
                    ? '#27a644'
                    : entry.type === 'pending'
                      ? '#62666d'
                      : '#d0d6e0',
              }}
            >
              {entry.message}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <div style={{ color: '#62666d' }}>No execution logs available.</div>
        )}
      </div>
    </div>
  )
}
