import { Navigate } from 'react-router-dom'

import { DashboardPage } from '@/pages/DashboardPage'
import { usePortfolioData } from '@/hooks/usePortfolioData'

export function PortfolioRedirect() {
  const projects = usePortfolioData()

  if (projects === undefined) {
    return (
      <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
        <div className="text-sm font-medium text-[#8a8f98]">Loading...</div>
      </div>
    )
  }

  if (projects.length > 1) {
    return <Navigate to="/portfolio" replace />
  }

  return <DashboardPage />
}
