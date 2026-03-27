import { WelcomeScreen } from '@/components/WelcomeScreen'
import { LogViewer } from '@/components/LogViewer'
import { ProjectCard } from '@/components/ProjectCard'
import { ResultPanel } from '@/components/ResultPanel'
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
  const totalTracks = fleet.projects.reduce(
    (count, project) => count + (project.tracks?.length ?? 0),
    0,
  )
  const latestProject = fleet.projects[0]

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardDescription>Registered projects</CardDescription>
            <CardTitle className="text-3xl">{fleet.projects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardDescription>Total tracks</CardDescription>
            <CardTitle className="text-3xl">{totalTracks}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardDescription>Live output</CardDescription>
            <CardTitle className="text-3xl">{connected ? 'Online' : 'Idle'}</CardTitle>
          </CardHeader>
        </Card>
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

            {fleet.error ? (
              <ResultPanel
                title="Load Error"
                status="failed"
                subtitle="One or more API requests failed"
                output=""
                error={fleet.error}
              />
            ) : null}
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
