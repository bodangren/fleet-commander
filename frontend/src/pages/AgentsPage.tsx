import { Link } from 'react-router-dom'

import { AgentCard, getAgentCategory } from '@/components/AgentCard'
import { EmptyState } from '@/components/EmptyState'
import { ResultPanel } from '@/components/ResultPanel'
import { Button } from '@/components/ui/button'
import type { FleetDataState } from '@/lib/useFleetData'
import type { AgentRecord } from '@/lib/fleetTypes'
import { useAgentWorkload } from '@/lib/useFleetApi'

export function AgentsPage({ fleet }: { fleet: FleetDataState }) {
  const { data: workloadData } = useAgentWorkload()

  const workloadMap = new Map(workloadData?.map(w => [w.name, w]) ?? [])

  const agentsByCategory = fleet.agents.reduce<Record<string, AgentRecord[]>>((acc, agent) => {
    const category = getAgentCategory(agent)
    if (!acc[category]) acc[category] = []
    acc[category].push(agent)
    return acc
  }, {})

  const categoryOrder = [
    'Leadership',
    'Engineering',
    'Quality',
    'Operations',
    'Documentation',
    'Other',
  ]
  const sortedCategories = Object.keys(agentsByCategory).sort((a, b) => {
    const idxA = categoryOrder.indexOf(a)
    const idxB = categoryOrder.indexOf(b)
    if (idxA === -1 && idxB === -1) return a.localeCompare(b)
    if (idxA === -1) return 1
    if (idxB === -1) return -1
    return idxA - idxB
  })

  return (
    <div className="space-y-8">
      <h2 className="sr-only">Agents</h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">AI Team Org Chart</h3>
          <p className="text-sm text-muted-foreground">
            {fleet.agents.length} agents organized by role category.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/agents/new/edit">Add Agent</Link>
        </Button>
      </div>

      {fleet.agents.length === 0 ? (
        <EmptyState text="The agent registry is empty or failed to load." />
      ) : (
        sortedCategories.map(category => (
          <section key={category} className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300/80 border-b border-border/60 pb-2">
              {category}
            </h4>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {agentsByCategory[category].map(agent => (
                <AgentCard
                  key={agent.definition.name}
                  agent={agent}
                  busy={fleet.busyAgent === agent.definition.name}
                  onTest={() => {
                    void fleet.testAgent(agent.definition.name)
                  }}
                  workload={workloadMap.get(agent.definition.name)}
                />
              ))}
            </div>
          </section>
        ))
      )}

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
