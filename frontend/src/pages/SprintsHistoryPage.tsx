export function SprintsHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Sprint History</h2>
        <p className="text-sm text-[#8a8f98] mt-1">
          Past sprints with performance metrics and retrospectives
        </p>
      </div>

      <div className="rounded-xl border border-[#23252a] bg-[#0f1011]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#23252a]">
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Sprint
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Points
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Cost
              </th>
              <th className="text-left text-[11px] font-medium text-[#62666d] uppercase tracking-wider px-4 py-3">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {[13, 12, 11, 10].map(sprint => (
              <tr key={sprint} className="border-b border-[#23252a] hover:bg-[#0f1011]">
                <td className="px-4 py-3 text-sm font-medium">Sprint {sprint}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(39,166,68,0.15)] text-[#27a644]">
                    Completed
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">16 pts</td>
                <td className="px-4 py-3 text-sm">$42.30</td>
                <td className="px-4 py-3 text-sm text-[#8a8f98]">5 days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
