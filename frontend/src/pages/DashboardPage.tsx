import { AgentUtilization } from '@/components/AgentUtilization'
import { IssueResolution } from '@/components/IssueResolution'
import { LogViewer } from '@/components/LogViewer'
import { OverviewStats } from '@/components/OverviewStats'
import { ProjectCard } from '@/components/ProjectCard'
import { ResultPanel } from '@/components/ResultPanel'
import { VelocityChart } from '@/components/VelocityChart'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { FleetStatusWidget } from '@/components/FleetStatusWidget'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
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
    <section className="space-y-8">
      <FleetStatusWidget />

      <OverviewStats />

      <div className="grid gap-6 md:grid-cols-3">
        <AgentUtilization />
        <VelocityChart />
        <IssueResolution />
      </div>

      {fleet.projects.length === 0 ? (
        <WelcomeScreen projectCount={fleet.projects.length} onImported={fleet.refresh} />
      ) : (
        <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
          <Card className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_theme(colors.secondary.DEFAULT)]">
            <CardHeader className="flex flex-row items-start justify-between gap-6 p-8 border-b-4 border-border bg-muted/30">
              <div className="space-y-1">
                <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
                  WORKSPACES
                </h2>
                <CardDescription className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                  // Registered orchestrators detected on daemon.
                </CardDescription>
              </div>
              <div className="bg-primary text-primary-foreground font-black px-4 py-2 text-sm italic uppercase">
                {fleet.projects.length} ACTIVE_CHANNELS
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 p-8">
              {fleet.projects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_theme(colors.primary.DEFAULT)]">
              <CardHeader className="p-8 border-b-4 border-border bg-muted/30">
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                  LIVE_FEED
                </h2>
                <CardDescription className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                  // {latestProject ? latestProject.name : 'NO_SIGNAL'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <LogViewer
                  lines={lines}
                  connected={connected}
                  className="h-[32rem] border-4 border-border bg-black"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {fleet.error ? (
        <ResultPanel
          title="Load Error"
          status="failed"
          subtitle="One or more API requests failed"
          output=""
          error={fleet.error}
        />
      ) : null}
    </section>
  )
}
