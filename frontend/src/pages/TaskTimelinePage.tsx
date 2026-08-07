import { Link, useParams } from 'react-router-dom'

import { PipelineTimeline } from '@/components/timeline/PipelineTimeline'
import { AgentChain } from '@/components/timeline/AgentChain'
import { ExecutionLog } from '@/components/timeline/ExecutionLog'
import { TaskInfoBar } from '@/components/timeline/TaskInfoBar'
import { QualityStageRow } from '@/components/timeline/QualityStageRow'
import { useTaskTimeline } from '@/hooks/useTaskTimeline'
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout'

export function TaskTimelinePage() {
  const { taskId } = useParams()
  const { data, loading, error } = useTaskTimeline(taskId)
  const timedOut = useLoadingTimeout(loading)

  if (loading && !timedOut) {
    return <div style={{ padding: 48, color: '#8a8f98' }}>Loading timeline...</div>
  }

  if (timedOut) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-red-400">
          Unable to load timeline. The task may not exist or the backend is unavailable.
        </p>
      </div>
    )
  }

  if (error) {
    return <div style={{ padding: 48, color: '#eb3d54' }}>Error: {error}</div>
  }

  if (!data || !data.task) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm font-medium text-foreground">No run contract — legacy task</p>
        <p className="text-sm text-muted-foreground">
          Task {taskId ?? 'unknown'} predates the Run Contract rollout
        </p>
        <Link to="/" className="text-sm text-cyan-300 hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const qualityStages = data.qualityStages ?? []

  return (
    <div style={{ padding: '32px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '-0.5px',
            color: '#f7f8f8',
          }}
        >
          Task Timeline
        </h2>
        <p style={{ fontSize: 14, color: '#8a8f98', marginTop: 4 }}>{data.task.title}</p>
      </div>

      <TaskInfoBar
        task={data.task}
        agents={data.agents}
        sprint={data.sprint}
        project={data.project}
      />

      <PipelineTimeline pipelineRuns={data.pipelineRuns} agents={data.agents} />

      {qualityStages.length > 0 ? (
        <section className="mt-8 space-y-3" aria-label="Quality stages">
          <h3 className="text-lg font-semibold text-foreground">Quality stages</h3>
          <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4">
            {qualityStages.map((attempt, i) => (
              <QualityStageRow key={attempt._id} index={i + 1} attempt={attempt} />
            ))}
          </div>
        </section>
      ) : null}

      <AgentChain pipelineRuns={data.pipelineRuns} agents={data.agents} />

      <ExecutionLog pipelineRuns={data.pipelineRuns} agents={data.agents} />
    </div>
  )
}
