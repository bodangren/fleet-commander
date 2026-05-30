import { useParams } from 'react-router-dom'
import { PipelineTimeline } from '@/components/timeline/PipelineTimeline'
import { AgentChain } from '@/components/timeline/AgentChain'
import { ExecutionLog } from '@/components/timeline/ExecutionLog'
import { TaskInfoBar } from '@/components/timeline/TaskInfoBar'
import { useTaskTimeline } from '@/hooks/useTaskTimeline'

/**
 * Task timeline page component displaying pipeline runs, agent chain, and execution logs
 */
export function TaskTimelinePage() {
  const { taskId } = useParams()
  const { data, loading, error } = useTaskTimeline(taskId)

  if (loading) {
    return <div style={{ padding: 48, color: '#8a8f98' }}>Loading timeline...</div>
  }

  if (error) {
    return <div style={{ padding: 48, color: '#eb3d54' }}>Error: {error}</div>
  }

  if (!data || !data.task) {
    return <div style={{ padding: 48, color: '#8a8f98' }}>No timeline data found.</div>
  }

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

      <AgentChain pipelineRuns={data.pipelineRuns} agents={data.agents} />

      <ExecutionLog pipelineRuns={data.pipelineRuns} agents={data.agents} />
    </div>
  )
}
