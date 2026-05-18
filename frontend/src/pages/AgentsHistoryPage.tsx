export function AgentsHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Agent History</h2>
        <p className="text-sm text-[#8a8f98] mt-1">
          Historical performance and cost trends by agent
        </p>
      </div>

      <div className="rounded-xl border border-[#23252a] bg-[#0f1011]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#23252a]">
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Agent
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Role
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Tasks
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Success Rate
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Avg Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: '@alice', role: 'Architect', tasks: 12, rate: '94%', cost: '$4.20' },
              { name: '@bob', role: 'Executor', tasks: 18, rate: '89%', cost: '$2.10' },
              { name: '@carol', role: 'Reviewer', tasks: 24, rate: '96%', cost: '$1.80' },
            ].map(agent => (
              <tr key={agent.name} className="border-b border-[#23252a] hover:bg-[#0f1011]">
                <td className="px-4 py-3 text-sm font-medium text-[#5e6ad2]">{agent.name}</td>
                <td className="px-4 py-3 text-sm">{agent.role}</td>
                <td className="px-4 py-3 text-sm">{agent.tasks}</td>
                <td className="px-4 py-3 text-sm text-[#27a644]">{agent.rate}</td>
                <td className="px-4 py-3 text-sm">{agent.cost}/pt</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
