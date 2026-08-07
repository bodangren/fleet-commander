import { QualityOperationsPanel } from './operations/QualityOperationsPanel'

/**
 * Dedicated operations surface for quality run diagnose / retry.
 * Route: `/ops/quality`
 */
export function OpsQualityPage() {
  return (
    <div className="p-6 md:p-8">
      <QualityOperationsPanel projectSlug="demo-project" />
    </div>
  )
}
