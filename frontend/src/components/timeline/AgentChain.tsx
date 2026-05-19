import type { PipelineRun, TimelineAgent } from '@/hooks/useTaskTimeline'
import { STAGES, formatDuration, getStageStatus } from '@/lib/timeline'

interface AgentChainProps {
  pipelineRuns: PipelineRun[]
  agents: TimelineAgent[]
}

const STAGE_LABELS: Record<string, string> = {
  dispatch: 'Dispatch',
  architect: 'Architect',
  executor: 'Executor',
  reviewer: 'Reviewer',
  merger: 'Merger',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AgentChain({ pipelineRuns, agents }: AgentChainProps) {
  return (
    <div
      style={{
        background: '#0f1011',
        border: '1px solid #23252a',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
      }}
      data-testid="agent-chain"
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
        Agent Chain
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {STAGES.map((stage, index) => {
          const { status, run } = getStageStatus(stage, pipelineRuns)
          const agent = run?.agentId ? agents.find(a => a._id === run.agentId) : null
          const label = agent ? getInitials(agent.name) : 'Sys'

          const borderColor =
            status === 'done' ? '#27a644' : status === 'active' ? '#5e6ad2' : 'transparent'
          const opacity = status === 'pending' ? 0.5 : 1

          const durationText =
            status === 'done' && run?.endTime && run?.startTime
              ? `${formatDuration(run.endTime - run.startTime)} ✓`
              : status === 'active'
                ? 'Running...'
                : 'Pending'
          const durationColor =
            status === 'done' ? '#27a644' : status === 'active' ? '#5e6ad2' : '#62666d'

          return (
            <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: '#141516',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  opacity,
                }}
                data-testid={`agent-chain-card-${stage}`}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#141516',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#5e6ad2',
                    border: '1px solid #23252a',
                  }}
                >
                  {label}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#f7f8f8' }}>
                    {STAGE_LABELS[stage]}
                  </div>
                  <div style={{ fontSize: '11px', color: durationColor }}>{durationText}</div>
                </div>
              </div>
              {index < STAGES.length - 1 && (
                <span style={{ color: '#34343a', fontSize: '14px' }}>→</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
