import { PipelineList } from '@/components/PipelineList'
import { PipelineLogs } from '@/components/PipelineLogs'
import { useState } from 'react'

export function PipelinesPage() {
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Pipelines</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pipeline execution history with logs and triggers
        </p>
      </div>

      <PipelineList onSelectExecution={setSelectedExecutionId} />

      {selectedExecutionId && (
        <div className="space-y-4">
          <PipelineLogs executionId={selectedExecutionId} />
        </div>
      )}
    </div>
  )
}
