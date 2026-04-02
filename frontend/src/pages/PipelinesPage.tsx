import { PipelineList } from '@/components/PipelineList'
import { PipelineExecutionCard } from '@/components/PipelineExecution'
import { PipelineLogs } from '@/components/PipelineLogs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'

export function PipelinesPage() {
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)

  return (
    <section className="space-y-4">
      <PipelineList />

      {selectedExecutionId && (
        <div className="space-y-4">
          <PipelineLogs executionId={selectedExecutionId} />
        </div>
      )}
    </section>
  )
}
