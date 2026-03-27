import { Link } from 'react-router-dom'

import { AgentCard } from '@/components/AgentCard'
import { EmptyState } from '@/components/EmptyState'
import { ResultPanel } from '@/components/ResultPanel'
import { Button } from '@/components/ui/button'
import type { FleetDataState } from '@/lib/useFleetData'

export function AgentsPage({ fleet }: { fleet: FleetDataState }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Agent Registry</h3>
          <p className="text-sm text-muted-foreground">
            Manage persona definitions and model wiring.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/agents/new/edit">Add Agent</Link>
        </Button>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fleet.agents.length === 0 ? (
          <EmptyState text="The agent registry is empty or failed to load." />
        ) : (
          fleet.agents.map(agent => (
            <AgentCard
              key={agent.definition.name}
              agent={agent}
              busy={fleet.busyAgent === agent.definition.name}
              onTest={() => {
                void fleet.testAgent(agent.definition.name)
              }}
            />
          ))
        )}
      </section>

      {fleet.agentTestResult ? (
        <ResultPanel
          title={`Agent Test: ${fleet.agentTestResult.name}`}
          status={fleet.agentTestResult.status === 'success' ? 'success' : 'failed'}
          subtitle={`${fleet.agentTestResult.latencyMs} ms`}
          output={fleet.agentTestResult.output}
          error={fleet.agentTestResult.error}
        />
      ) : null}
    </div>
  )
}
