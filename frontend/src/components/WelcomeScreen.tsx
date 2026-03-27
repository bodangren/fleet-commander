import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { WorkspaceScanner } from './WorkspaceScanner'

export function WelcomeScreen({
  projectCount,
  onImported,
}: {
  projectCount: number
  onImported?: () => Promise<void> | void
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <Card className="overflow-hidden border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_42%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.92))] shadow-2xl shadow-cyan-950/20">
        <CardHeader className="space-y-4">
          <div className="inline-flex w-fit items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100">
            Workspace onboarding
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl leading-tight">
              Bring a workspace into Fleet Commander.
            </CardTitle>
            <CardDescription className="max-w-xl text-base text-slate-300">
              No registered projects yet. Scan a local root directory, import every Conductor
              workspace you want to manage, and start routing tasks from one dashboard.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Registered projects
            </p>
            <p className="mt-2 text-2xl font-semibold">{projectCount}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Next step</p>
            <p className="mt-2 text-sm text-slate-300">
              Scan a workspace root to discover `conductor/` folders.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Management surface
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Review projects, agents, and harnesses from one local control plane.
            </p>
          </div>
        </CardContent>
      </Card>

      <WorkspaceScanner onImported={onImported} />
    </section>
  )
}
