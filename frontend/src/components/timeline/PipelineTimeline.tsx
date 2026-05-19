import type { PipelineRun, TimelineAgent } from '@/hooks/useTaskTimeline'
import { STAGES, formatDuration, getStageStatus } from '@/lib/timeline'

interface PipelineTimelineProps {
  pipelineRuns: PipelineRun[]
  agents: TimelineAgent[]
}

export function PipelineTimeline({ pipelineRuns, agents }: PipelineTimelineProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '24px',
      }}
      data-testid="pipeline-timeline"
    >
      {STAGES.map((stage, index) => {
        const { status, run } = getStageStatus(stage, pipelineRuns)
        const agent = run?.agentId ? agents.find(a => a._id === run.agentId) : null

        const borderColor =
          status === 'done' ? '#27a644' : status === 'active' ? '#5e6ad2' : '#23252a'
        const bgColor = status === 'active' ? 'rgba(94,106,210,0.08)' : '#0f1011'
        const statusColor =
          status === 'done' ? '#27a644' : status === 'active' ? '#5e6ad2' : '#62666d'

        const durationText =
          status === 'done' && run?.endTime && run?.startTime
            ? formatDuration(run.endTime - run.startTime)
            : status === 'active'
              ? 'Running...'
              : 'Pending'

        return (
          <div
            key={stage}
            style={{
              flex: 1,
              padding: '12px',
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              textAlign: 'center',
            }}
            data-testid={`timeline-stage-${stage}`}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: '#8a8f98',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}
            >
              Stage {index + 1}
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 500,
                marginTop: '4px',
                color: '#f7f8f8',
                textTransform: 'capitalize',
              }}
            >
              {stage}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: agent ? '#5e6ad2' : '#62666d',
                marginTop: '4px',
              }}
            >
              {agent ? `@${agent.name}` : 'System'}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: statusColor,
                marginTop: '2px',
              }}
              data-testid={`stage-status-${stage}`}
            >
              {status === 'done' ? `${durationText} ✓` : durationText}
            </div>
          </div>
        )
      })}
    </div>
  )
}
