import { PipelineList } from '@/components/PipelineList'
import { PipelineLogs } from '@/components/PipelineLogs'
import { useState } from 'react'

export function PipelinesPage() {
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)

  return (
    <section className="space-y-4">
      <PipelineList onSelectExecution={setSelectedExecutionId} />

      {selectedExecutionId && (
        <div className="space-y-4">
          <PipelineLogs executionId={selectedExecutionId} />
        </div>
      )}
    </section>
  )
}
