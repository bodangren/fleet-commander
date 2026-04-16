import { useState, useEffect, useCallback } from 'react'

import { QueueHealth } from '@/components/QueueHealth'
import { FleetHealth } from '@/components/FleetHealth'
import { DispatchTimeline } from '@/components/DispatchTimeline'
import { Governance } from '@/components/Governance'
import {
  useQueueHealth,
  useFleetHealth,
  useDispatchTimeline,
  useGovernanceEvents,
  useReconciliationEvents,
  usePolicyWeights,
} from '@/lib/useConvexData'

export type OpsTab = 'queue' | 'fleet' | 'timeline' | 'governance'

const tabs: { id: OpsTab; label: string }[] = [
  { id: 'queue', label: 'Queue' },
  { id: 'fleet', label: 'Fleet' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'governance', label: 'Governance' },
]

function TabButton({
  active,
  label,
  onClick,
  'data-testid': testId,
}: {
  active: boolean
  label: string
  onClick: () => void
  'data-testid'?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={
        active
          ? 'rounded-xl bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-300 shadow-sm'
          : 'rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-black/20 hover:text-foreground'
      }
    >
      {label}
    </button>
  )
}

export function OpsPage() {
  const [activeTab, setActiveTab] = useState<OpsTab>('queue')
  const queueHealth = useQueueHealth()
  const fleetHealth = useFleetHealth()
  const dispatchTimeline = useDispatchTimeline()
  const governanceEvents = useGovernanceEvents()
  const reconciliationEvents = useReconciliationEvents()
  const policyWeights = usePolicyWeights()

  const governanceLoading =
    governanceEvents === undefined || reconciliationEvents === undefined || policyWeights === undefined

  const governanceData =
    governanceEvents && reconciliationEvents && policyWeights
      ? {
          governanceEvents,
          reconciliationEvents,
          policyWeights,
        }
      : undefined

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key, 10) - 1
        const tab = tabs[index]
        if (tab) {
          e.preventDefault()
          setActiveTab(tab.id)
        }
      }
    },
    [setActiveTab],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <section className="space-y-4" data-testid="ops-page">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-black/20 p-2">
        {tabs.map((tab, index) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            label={`${index + 1}. ${tab.label}`}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
          />
        ))}
      </div>

      {activeTab === 'queue' && (
        <QueueHealth data={queueHealth} loading={queueHealth === undefined} />
      )}
      {activeTab === 'fleet' && (
        <FleetHealth data={fleetHealth} loading={fleetHealth === undefined} />
      )}
      {activeTab === 'timeline' && (
        <DispatchTimeline
          data={dispatchTimeline ? { entries: dispatchTimeline } : undefined}
          loading={dispatchTimeline === undefined}
        />
      )}
      {activeTab === 'governance' && (
        <Governance data={governanceData} loading={governanceLoading} />
      )}
    </section>
  )
}
