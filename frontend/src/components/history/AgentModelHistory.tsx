import type { AgentModelChange } from '@/__fixtures__/agentModelFixtures'

export interface AgentModelHistoryProps {
  changes: AgentModelChange[]
}

/**
 * Renders table of agent model changes with agent name, previous and new model
 */
export function AgentModelHistory({ changes }: AgentModelHistoryProps) {
  if (changes.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No model changes</div>
  }

  return (
    <div className="border-2 border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border bg-muted/30">
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Agent</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Previous</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">New</th>
          </tr>
        </thead>
        <tbody>
          {changes.map(change => (
            <tr key={change._id} className="border-b border-border">
              <td className="p-4 font-medium">{change.agentDisplayName}</td>
              <td className="p-4">{change.previousModel}</td>
              <td className="p-4">{change.newModel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
