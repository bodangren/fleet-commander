import { cn } from '@/lib/utils'

export type TabId = 'analytics' | 'performance' | 'costs'

interface InsightsTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'performance', label: 'Performance' },
  { id: 'costs', label: 'Costs' },
]

export function InsightsTabs({ activeTab, onTabChange }: InsightsTabsProps) {
  return (
    <div role="tablist" className="flex gap-1 border-b-2 border-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all',
            'border-b-4 -mb-[2px] border-transparent',
            'hover:bg-muted/50',
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}