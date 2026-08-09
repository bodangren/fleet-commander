import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'

import { usePortfolioData } from '@/hooks/usePortfolioData'

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then(module => ({ default: module.DashboardPage })),
)

/**
 * Chooses the portfolio or dashboard landing surface from the loaded project count.
 *
 * @returns The landing route content for the current fleet
 */
export function PortfolioRedirect() {
  const { projects } = usePortfolioData()

  if (projects === undefined) {
    return (
      <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
        <div className="text-sm font-medium text-[#8a8f98]">Loading...</div>
      </div>
    )
  }

  if (projects.length === 0) {
    return <Navigate to="/portfolio" replace />
  }

  if (projects.length > 1) {
    return <Navigate to="/portfolio" replace />
  }

  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <div className="text-sm font-medium text-[#8a8f98]">Loading...</div>
        </div>
      }
    >
      <DashboardPage />
    </Suspense>
  )
}
