import { Link } from 'react-router-dom'

import type { ProjectSummary } from '@/lib/fleetTypes'

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { ProjectHealthBadge } from '@/components/ProjectHealthBadge'
import { useActiveSprint } from '@/lib/useFleetApi'
import { useConvexTasks } from '@/lib/useConvexData'

type ProjectWithHealth = ProjectSummary & {
  health?: string
  lastError?: string
}

/**
 * Renders a card container
 * @param project - The project to display with health information
 */
export function ProjectCard({ project }: { project: ProjectWithHealth }) {
  const sprint = useActiveSprint(project.id)
  const tasksData = useConvexTasks(project.id)

  const tasks = tasksData as Array<{ status: string }> | undefined

  const activeCount = tasks ? tasks.filter(t => t.status === 'in_progress').length : undefined
  const blockedCount = tasks ? tasks.filter(t => t.status === 'blocked').length : undefined

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
            {blockedCount !== undefined && blockedCount > 0 ? (
              <span className="bg-destructive text-destructive-foreground font-black px-3 py-1 text-[10px] uppercase tracking-[0.3em] italic">
                {blockedCount} BLOCKED
              </span>
            ) : (
              <span className="bg-accent text-accent-foreground font-black px-3 py-1 text-[10px] uppercase tracking-[0.3em] italic">
                LIVE
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-6 pt-0">
          <div className="grid grid-cols-2 gap-2">
            {activeCount !== undefined && (
              <div className="flex flex-col items-center border-2 border-border bg-muted/30 p-2">
                <span
                  className={`text-2xl font-black italic tabular-nums ${activeCount > 0 ? 'text-primary' : ''}`}
                >
                  {activeCount}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  ACTIVE
                </span>
              </div>
            )}
            {blockedCount !== undefined && (
              <div className="flex flex-col items-center border-2 border-border bg-muted/30 p-2">
                <span
                  className={`text-2xl font-black italic tabular-nums ${blockedCount > 0 ? 'text-destructive' : ''}`}
                >
                  {blockedCount}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  BLOCKED
                </span>
              </div>
            )}
          </div>

          {sprint?.data && sprint.data.taskKeys.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  SPRINT: {sprint.data.name}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">
                  {sprint.data.taskKeys.length} TASKS
                </span>
              </div>
            </div>
          )}

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
