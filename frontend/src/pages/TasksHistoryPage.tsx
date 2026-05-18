export function TasksHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Task History</h2>
        <p className="text-sm text-[#8a8f98] mt-1">
          Completed tasks with execution logs and cost breakdown
        </p>
      </div>

      <div className="rounded-xl border border-[#23252a] bg-[#0f1011]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#23252a]">
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Task
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Agent
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Points
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Cost
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                task: 'Setup CI pipeline',
                agent: '@bob',
                points: 5,
                cost: '$8.40',
                status: 'Merged',
              },
              {
                task: 'Auth middleware',
                agent: '@alice',
                points: 5,
                cost: '$21.00',
                status: 'Merged',
              },
              {
                task: 'API documentation',
                agent: '@frank',
                points: 2,
                cost: '$2.40',
                status: 'Merged',
              },
            ].map((task, idx) => (
              <tr key={idx} className="border-b border-[#23252a] hover:bg-[#0f1011]">
                <td className="px-4 py-3 text-sm font-medium">{task.task}</td>
                <td className="px-4 py-3 text-sm text-[#5e6ad2]">{task.agent}</td>
                <td className="px-4 py-3 text-sm">{task.points} pts</td>
                <td className="px-4 py-3 text-sm">{task.cost}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(39,166,68,0.15)] text-[#27a644]">
                    {task.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
