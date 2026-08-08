import { EmptyState } from '@/components/EmptyState'
import { HarnessCard } from '@/components/HarnessCard'
import { ResultPanel } from '@/components/ResultPanel'
import type { FleetDataState } from '@/lib/useFleetData'

/**
 * Lists configured test harnesses with discovery and edit actions.
 */
export function HarnessesPage({ fleet }: { fleet: FleetDataState }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Pi Provider Catalog</h3>
          <p className="text-sm text-muted-foreground">
            Installed Pi providers and model mappings. This catalog is read-only.
          </p>
        </div>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {fleet.harnesses.length === 0 ? (
          <EmptyState text="The harness registry is empty or failed to load." />
        ) : (
          fleet.harnesses.map(harness => (
            <HarnessCard
              key={harness.definition.name}
              harness={harness}
              busy={fleet.busyHarness === harness.definition.name}
              onTestDiscovery={() => {
                void fleet.testHarnessDiscovery(harness.definition.name)
              }}
            />
          ))
        )}
      </section>

      {fleet.harnessDiscoveryResult ? (
        <ResultPanel
          title={`Discovery: ${fleet.harnessDiscoveryResult.name}`}
          status={fleet.harnessDiscoveryResult.error ? 'failed' : 'success'}
          subtitle={`${fleet.harnessDiscoveryResult.models.length} models`}
          output={fleet.harnessDiscoveryResult.models.join('\n')}
          error={fleet.harnessDiscoveryResult.error}
        />
      ) : null}
    </div>
  )
}
