import { LogViewer } from '@/components/LogViewer'
import type { FleetDataState } from '@/lib/useFleetData'

export function DashboardPage({
  fleet,
  lines,
  connected,
}: {
  fleet: FleetDataState
  lines: string[]
  connected: boolean
}) {
  const latestProject = fleet.projects[0]

  return (
    <section className="space-y-5">
      {/* Sprint Status */}
      <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Sprint 14</h2>
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(94,106,210,0.15)] text-[#5e6ad2]">
              Active
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#8a8f98]">Budget</div>
            <div className="text-2xl font-semibold">
              <span className="text-[#27a644]">$32.40</span>
              <span className="text-[#62666d] text-base font-normal"> / $50.00</span>
            </div>
          </div>
        </div>

        <div className="text-sm text-[#8a8f98] mb-4">Fleet Commander MVP · 18 story points</div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#141516] rounded-lg p-3">
            <div className="text-xs text-[#8a8f98] mb-1">Points Delivered</div>
            <div className="text-xl font-semibold">
              12 <span className="text-sm text-[#8a8f98] font-normal">/ 18</span>
            </div>
          </div>
          <div className="bg-[#141516] rounded-lg p-3">
            <div className="text-xs text-[#8a8f98] mb-1">Cost/Point</div>
            <div className="text-xl font-semibold text-[#27a644]">$1.80</div>
            <div className="text-xs text-[#27a644]">-29% vs est</div>
          </div>
          <div className="bg-[#141516] rounded-lg p-3">
            <div className="text-xs text-[#8a8f98] mb-1">Tasks Complete</div>
            <div className="text-xl font-semibold">
              12 <span className="text-sm text-[#8a8f98] font-normal">/ 18</span>
            </div>
          </div>
          <div className="bg-[#141516] rounded-lg p-3">
            <div className="text-xs text-[#8a8f98] mb-1">Budget Remaining</div>
            <div className="text-xl font-semibold">$17.60</div>
            <div className="text-xs text-[#8a8f98]">65% spent</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Key Metrics */}
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <h3 className="font-semibold mb-4">Key Metrics</h3>
          <div className="space-y-3">
            {[
              {
                label: 'Delivery Rate',
                desc: 'Points per dollar',
                value: '0.56',
                color: '#27a644',
              },
              {
                label: 'Success Rate',
                desc: 'First-pass completion',
                value: '92%',
                color: '#27a644',
              },
              {
                label: 'Avg Pipeline Time',
                desc: 'Dispatch to merge',
                value: '8m 32s',
                color: null,
              },
              { label: 'Rejection Rate', desc: 'Tasks sent back', value: '8%', color: '#27a644' },
            ].map(metric => (
              <div
                key={metric.label}
                className="flex items-center justify-between bg-[#141516] rounded-lg p-3"
              >
                <div>
                  <div className="text-sm font-medium">{metric.label}</div>
                  <div className="text-xs text-[#8a8f98]">{metric.desc}</div>
                </div>
                <div
                  className={`text-lg font-semibold ${metric.color ? `text-[${metric.color}]` : ''}`}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Status */}
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Agent Status</h3>
            <span className="text-xs text-[#8a8f98]">4 active · 2 idle · 1 blocked</span>
          </div>
          <div className="space-y-2">
            {[
              {
                initials: 'AL',
                name: '@alice',
                role: 'Architect · Auth middleware',
                status: 'Active',
                statusColor: '#27a644',
              },
              {
                initials: 'BO',
                name: '@bob',
                role: 'Executor · Employee roster',
                status: 'Active',
                statusColor: '#27a644',
              },
              {
                initials: 'CA',
                name: '@carol',
                role: 'Reviewer · CI pipeline',
                status: 'Active',
                statusColor: '#27a644',
              },
              {
                initials: 'DA',
                name: '@dave',
                role: 'Waiting for @bob',
                status: 'Blocked',
                statusColor: '#eab308',
              },
            ].map(agent => (
              <div
                key={agent.name}
                className="flex items-center gap-3 bg-[#141516] rounded-lg p-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-[#141516] border border-[#23252a] flex items-center justify-center text-xs font-semibold text-[#5e6ad2]">
                  {agent.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{agent.name}</div>
                  <div className="text-xs text-[#8a8f98] truncate">{agent.role}</div>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-[${agent.statusColor}15] text-[${agent.statusColor}]`}
                >
                  {agent.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Attention Needed */}
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <h3 className="font-semibold mb-4">Attention Needed</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(235,61,84,0.08)] border border-[rgba(235,61,84,0.2)]">
              <div className="text-lg">⊘</div>
              <div className="flex-1">
                <div className="text-sm font-medium">2 tasks blocked</div>
                <div className="text-xs text-[#8a8f98]">Database migration, Deploy staging</div>
              </div>
              <button className="text-xs text-[#8a8f98] hover:text-[#f7f8f8]">View →</button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.2)]">
              <div className="text-lg">!</div>
              <div className="flex-1">
                <div className="text-sm font-medium">Budget at 65%</div>
                <div className="text-xs text-[#8a8f98]">$17.60 remaining · 6 tasks left</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(94,106,210,0.08)] border border-[rgba(94,106,210,0.2)]">
              <div className="text-lg">◎</div>
              <div className="flex-1">
                <div className="text-sm font-medium">A/B test running</div>
                <div className="text-xs text-[#8a8f98]">Gemini vs Sonnet · 8/16 tasks</div>
              </div>
              <button className="text-xs text-[#8a8f98] hover:text-[#f7f8f8]">View →</button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              {
                icon: '✓',
                color: '#27a644',
                bg: 'rgba(39,166,68,0.15)',
                text: '@bob merged "Setup CI pipeline"',
                meta: '5 pts · $8.40 · 2 min ago',
              },
              {
                icon: '→',
                color: '#5e6ad2',
                bg: 'rgba(94,106,210,0.15)',
                text: '@carol reviewing "Auth middleware"',
                meta: '5 pts · 4 min ago',
              },
              {
                icon: '⊘',
                color: '#eab308',
                bg: 'rgba(234,179,8,0.15)',
                text: '@bob blocked on "DB migration"',
                meta: 'Convex schema conflict · 8 min ago',
              },
              {
                icon: '✓',
                color: '#27a644',
                bg: 'rgba(39,166,68,0.15)',
                text: '@frank merged "API docs"',
                meta: '2 pts · $2.40 · 12 min ago',
              },
              {
                icon: '→',
                color: '#5e6ad2',
                bg: 'rgba(94,106,210,0.15)',
                text: '@alice started "Auth middleware"',
                meta: '5 pts · 15 min ago',
              },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs"
                  style={{ background: activity.bg, color: activity.color }}
                >
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="text-[#5e6ad2]">{activity.text.split(' ')[0]}</span>{' '}
                    {activity.text.split(' ').slice(1).join(' ')}
                  </div>
                  <div className="text-xs text-[#8a8f98]">{activity.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Log Viewer */}
      {latestProject && (
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <h3 className="font-semibold mb-4">Live Feed</h3>
          <LogViewer
            lines={lines}
            connected={connected}
            className="h-[24rem] border border-[#23252a] bg-[#010102] rounded-lg"
          />
        </div>
      )}
    </section>
  )
}
