import { Link } from 'react-router-dom'

import type { MockAgent } from '@/__fixtures__/dashboardFixtures'
import { cn } from '@/lib/utils'

function StatusBadge({ status }: { status: MockAgent['status'] }) {
  const map: Record<MockAgent['status'], { icon: string; className: string }> = {
    Active: { icon: '', className: 'bg-green-500/10 text-green-500' },
    Idle: { icon: '', className: 'bg-yellow-500/10 text-yellow-500' },
    Blocked: { icon: '', className: 'bg-red-500/10 text-red-500' },
  }
  const config = map[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
        config.className,
      )}
    >
      {status}
    </span>
  )
}

interface AgentRowProps {
  agent: MockAgent
}

function AgentRow({ agent }: AgentRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-2 border-border p-3">
      <div className="min-w-0 space-y-1">
        <Link
          to={`/agents/${encodeURIComponent(agent.name)}/edit`}
          className="font-black text-base uppercase tracking-tight hover:underline"
        >
          {agent.displayName}
        </Link>
        {agent.currentTask && (
          <p className="text-sm text-muted-foreground truncate">{agent.currentTask}</p>
        )}
      </div>
      <StatusBadge status={agent.status} />
    </div>
  )
}

export function AgentStatus({ agents }: { agents: MockAgent[] }) {
  if (agents.length === 0) {
    return (
      <div className="border-2 border-border bg-card p-6">
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
          No agents
        </p>
      </div>
    )
  }

  return (
    <div className="border-2 border-border bg-card p-6 space-y-3">
      <div className="space-y-2">
        {agents.map(agent => (
          <AgentRow key={agent.name} agent={agent} />
        ))}
      </div>
    </div>
  )
}