import { lazy } from 'react'

/** Lazily loads the coverage chart for the project coverage tab. */
export const CoverageChart = lazy(() =>
  import('@/components/CoverageChart').then(module => ({ default: module.CoverageChart })),
)

/** Lazily loads the dependency graph for the project dependencies tab. */
export const DependencyGraph = lazy(() =>
  import('@/components/DependencyGraph').then(module => ({ default: module.DependencyGraph })),
)

/** Lazily loads the employee performance panel for the project performance tab. */
export const EmployeePerformancePanel = lazy(() =>
  import('@/components/performance/EmployeePerformancePanel').then(module => ({
    default: module.EmployeePerformancePanel,
  })),
)

/** Renders the loading state shown while a project tab panel is being loaded. */
export function ProjectTabLoading() {
  return <p className="text-sm text-[#8a8f98]">Loading project view...</p>
}
