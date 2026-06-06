import { useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { BlockersTable } from '@/components/BlockersTable'
import { useBlockers } from '@/lib/useFleetApi'
import { cn } from '@/lib/utils'

/**
 * Displays blocked tasks and open issues across all projects with filtering
 */
export function BlockersPage() {
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [agentFilter, setAgentFilter] = useState<string>('')
  const [typeTab, setTypeTab] = useState<'all' | 'blocked' | 'issues'>('all')

  const { data, loading, error } = useBlockers(projectFilter || undefined, agentFilter || undefined)

  const blockedTasks = data?.blockedTasks ?? []
  const openIssues = data?.openIssues ?? []

  const allProjects = Array.from(
    new Set([...blockedTasks.map(t => t.projectSlug), ...openIssues.map(i => i.projectSlug)]),
  )

  const allAgents = Array.from(
    new Set([
      ...blockedTasks.flatMap(t => (t.assignee ? [t.assignee] : [])),
      ...openIssues.flatMap(i => (i.assignedAgent ? [i.assignedAgent] : [])),
    ]),
  )

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="border-4 border-border bg-background px-4 py-2 text-xs font-bold uppercase tracking-widest appearance-none color-scheme-dark"
        >
          <option value="">ALL_PROJECTS</option>
          {allProjects.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="border-4 border-border bg-background px-4 py-2 text-xs font-bold uppercase tracking-widest appearance-none color-scheme-dark"
        >
          <option value="">ALL_AGENTS</option>
          {allAgents.map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <div className="flex border-4 border-border">
          {(['all', 'blocked', 'issues'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setTypeTab(tab)}
              className={cn(
                'px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
                typeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Card className="border-4 border-destructive bg-card p-6">
          <p className="text-sm text-destructive font-bold">ERROR: {error}</p>
        </Card>
      )}

      {(typeTab === 'all' || typeTab === 'blocked') && (
        <Card className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_hsl(var(--destructive)/30)]">
          <CardHeader className="border-b-4 border-border bg-muted/30 p-6">
            <h3 className="text-3xl font-black italic tracking-tighter uppercase">BLOCKED TASKS</h3>
            <CardDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {blockedTasks.length} TASK{blockedTasks.length === 1 ? '' : 'S'} NEED INTERVENTION
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
                LOADING...
              </div>
            ) : (
              <BlockersTable
                tasks={blockedTasks}
                onViewTask={taskKey => {
                  window.location.href = `/board?task=${taskKey}`
                }}
                onReassignBlocker={() => {
                  // TODO: open reassign modal
                }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {(typeTab === 'all' || typeTab === 'issues') && (
        <Card className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_hsl(var(--primary)/20)]">
          <CardHeader className="border-b-4 border-border bg-muted/30 p-6">
            <h3 className="text-3xl font-black italic tracking-tighter uppercase">OPEN ISSUES</h3>
            <CardDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {openIssues.length} ISSUE{openIssues.length === 1 ? '' : 'S'} ACROSS ALL PROJECTS
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
                LOADING...
              </div>
            ) : openIssues.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                NO_OPEN_ISSUES
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b-4 border-border bg-muted/20">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-black uppercase tracking-widest">PROJECT</th>
                      <th className="px-4 py-3 font-black uppercase tracking-widest">ISSUE</th>
                      <th className="px-4 py-3 font-black uppercase tracking-widest">AGENT</th>
                      <th className="px-4 py-3 font-black uppercase tracking-widest">AGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openIssues.map(issue => (
                      <tr
                        key={issue.issueId}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-mono font-bold">
                          {issue.projectName ?? issue.projectSlug}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold">{issue.title}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {issue.assignedAgent ? `@${issue.assignedAgent}` : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                          {formatAge(Date.now() - issue.openedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  )
}

/**
 * Formats milliseconds into human-readable age string (just now, hours, days)
 * @param ms - duration in milliseconds
 */
function formatAge(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
