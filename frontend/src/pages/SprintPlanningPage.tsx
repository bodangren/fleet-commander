export function SprintPlanningPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Sprint Planning</h2>
          <p className="text-sm text-[#8a8f98] mt-1">
            PM Agent recommends tasks · You set the budget · Then trigger the sprint
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium border border-[#34343a] rounded-md hover:bg-[#141516]">
            Recalculate
          </button>
          <button className="px-4 py-2 text-sm font-medium bg-[#5e6ad2] text-white rounded-md hover:bg-[#828fff]">
            Start Sprint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <h3 className="font-semibold mb-4">Project</h3>
          <select className="w-full bg-[#0f1011] border border-[#34343a] rounded-md px-3 py-2 text-sm mb-4">
            <option>Fleet Commander</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141516] rounded-md p-3">
              <div className="text-[11px] text-[#8a8f98]">Backlog Tasks</div>
              <div className="text-xl font-semibold">24</div>
            </div>
            <div className="bg-[#141516] rounded-md p-3">
              <div className="text-[11px] text-[#8a8f98]">Total Points</div>
              <div className="text-xl font-semibold">68</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <h3 className="font-semibold mb-4">Budget</h3>
          <div className="mb-4">
            <label className="text-xs text-[#8a8f98] block mb-2">Sprint Budget</label>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">$</span>
              <input
                type="text"
                defaultValue="50.00"
                className="bg-[#0f1011] border border-[#34343a] rounded-md px-3 py-2 text-xl font-semibold w-28"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141516] rounded-md p-3">
              <div className="text-[11px] text-[#8a8f98]">Avg Cost/Point</div>
              <div className="text-xl font-semibold">$2.53</div>
            </div>
            <div className="bg-[#141516] rounded-md p-3">
              <div className="text-[11px] text-[#8a8f98]">Max Points</div>
              <div className="text-xl font-semibold">19</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#5e6ad2] bg-[#0f1011] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-md bg-[rgba(94,106,210,0.15)] flex items-center justify-center text-[#5e6ad2] text-sm font-semibold">
            PM
          </div>
          <div>
            <div className="font-semibold">PM Agent Recommendation</div>
            <div className="text-sm text-[#8a8f98]">
              Based on priority, agent availability, and historical cost data
            </div>
          </div>
        </div>
        <div className="bg-[#141516] rounded-md p-4 text-sm leading-relaxed text-[#d0d6e0]">
          <strong className="text-[#f7f8f8]">Recommended sprint:</strong> 18 story points across 5
          tasks. Estimated cost: $45.60 (within $50 budget with 9% buffer). Prioritized high-value
          tasks that fit the budget.
        </div>
      </div>
    </div>
  )
}
