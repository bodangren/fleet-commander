import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { InsightsTabs, type TabId } from '@/components/insights/InsightsTabs'
import { AnalyticsPage } from './AnalyticsPage'
import { PerformancePage } from './PerformancePage'
import { CostsPage } from './CostsPage'

function getTabFromUrl(tab: string | undefined): TabId {
  if (tab === 'analytics' || tab === 'performance' || tab === 'costs') return tab
  return 'analytics'
}

export function InsightsPage() {
  const { tab } = useParams<{ tab?: string }>()
  const navigate = useNavigate()
  const activeTab = getTabFromUrl(tab)

  function handleTabChange(newTab: TabId) {
    navigate(`/insights/${newTab}`)
  }

  return (
    <div className="space-y-6">
      <InsightsTabs activeTab={activeTab} onTabChange={handleTabChange} />
      {activeTab === 'analytics' && <AnalyticsPage />}
      {activeTab === 'performance' && <PerformancePage />}
      {activeTab === 'costs' && <CostsPage />}
    </div>
  )
}