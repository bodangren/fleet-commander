import { Link } from 'react-router-dom'

import type { ProjectSummary } from '@/lib/fleetTypes'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Card className="group border-border/60 bg-background/60 transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-background/80">
      <Link to={`/project/${encodeURIComponent(project.id)}`} className="block h-full">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{project.name}</CardTitle>
              <CardDescription className="break-all text-xs">{project.path}</CardDescription>
            </div>
            <span className="rounded-full border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition group-hover:border-cyan-400/30 group-hover:text-cyan-100">
              Open
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tracks</span>
            <span className="font-medium">{project.tracks?.length ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Project ID</span>
            <span className="font-mono text-xs">{project.id}</span>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
