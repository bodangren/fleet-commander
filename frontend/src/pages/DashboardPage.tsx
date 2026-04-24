import { AgentUtilization } from '@/components/AgentUtilization'
import { IssueResolution } from '@/components/IssueResolution'
import { LogViewer } from '@/components/LogViewer'
import { OverviewStats } from '@/components/OverviewStats'
import { ProjectCard } from '@/components/ProjectCard'
import { ResultPanel } from '@/components/ResultPanel'
import { VelocityChart } from '@/components/VelocityChart'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <section className="space-y-4">
      <OverviewStats />

      <div className="grid gap-4 md:grid-cols-3">
        <AgentUtilization />
        <VelocityChart />
        <IssueResolution />
      </div>

      {fleet.projects.length === 0 ? (
        <WelcomeScreen projectCount={fleet.projects.length} onImported={fleet.refresh} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card className="bg-card/80 backdrop-blur">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Registered workspaces tracked by the daemon.</CardDescription>
              </div>
              <div className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                {fleet.projects.length} total
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {fleet.projects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Live Output</CardTitle>
                <CardDescription>
                  Streaming output from {latestProject ? latestProject.name : 'the first project'}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LogViewer
                  lines={lines}
                  connected={connected}
                  className="h-[28rem] border border-border/60"
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
