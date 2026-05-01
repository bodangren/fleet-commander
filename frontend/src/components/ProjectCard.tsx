import { Link } from 'react-router-dom'

import type { ProjectSummary } from '@/lib/fleetTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectWithHealth = ProjectSummary & Record<string, any>

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { ProjectHealthBadge } from '@/components/ProjectHealthBadge'

export function ProjectCard({ project }: { project: ProjectWithHealth }) {
  return (
    <Card className="group border-4 border-border bg-card transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:border-primary hover:shadow-[12px_12px_0px_0px_hsl(var(--secondary))]">
      <Link to={`/project/${encodeURIComponent(project.id)}`} className="block h-full">
        <CardHeader className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-black italic tracking-tighter leading-none uppercase">
                {project.name}
              </h3>
              <CardDescription className="break-all text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                // {project.path}
              </CardDescription>
            </div>
            <span className="bg-primary text-primary-foreground font-black px-3 py-1 text-[10px] uppercase tracking-[0.3em] italic">
              OPEN
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
            <span className="text-muted-foreground">TRACKS</span>
            <span className="bg-secondary text-secondary-foreground px-2 py-0.5">
              {project.tracks?.length ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
            <span className="text-muted-foreground">HEALTH_STATUS</span>
            <ProjectHealthBadge
              health={project.health || 'healthy'}
              lastError={project.lastError}
            />
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
