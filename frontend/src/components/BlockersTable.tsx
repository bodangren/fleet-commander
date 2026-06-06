import type { BlockedTask } from '@/lib/useFleetApi'
import { BlockerChain } from '@/components/BlockerChain'

type BlockersTableProps = {
  tasks: BlockedTask[]
  onViewTask: (taskKey: string) => void
  onReassignBlocker: (taskKey: string) => void
}

/**
 * Formats milliseconds into human-readable age string
 * @param ms - duration in milliseconds
 */
function formatAge(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

/**
 * Dedicated table component for blocked tasks with project, sprint,
 * blocker chain, estimated unblock time, and action columns.
 */
export function BlockersTable({ tasks, onViewTask, onReassignBlocker }: BlockersTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
        NO_BLOCKED_TASKS
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="border-b-4 border-border bg-muted/20">
          <tr className="text-left">
            <th className="px-4 py-3 font-black uppercase tracking-widest">PROJECT</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest">TASK</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest">AGENT</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest">AGE</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest">SPRINT</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest">BLOCKER CHAIN</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest">ESTIMATED UNBLOCK</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.taskKey} className="border-b border-border/50 hover:bg-muted/30">
              <td className="px-4 py-3 font-mono font-bold">
                {task.projectName ?? task.projectSlug}
              </td>
              <td className="px-4 py-3">
                <span className="font-bold">{task.title}</span>
                <span className="ml-2 text-muted-foreground font-mono text-[10px]">
                  {task.taskKey}
                </span>
              </td>
              <td className="px-4 py-3 font-mono">{task.assignee ? `@${task.assignee}` : '—'}</td>
              <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                {formatAge(Date.now() - task.updatedAt)}
              </td>
              <td className="px-4 py-3 font-mono text-muted-foreground">{task.sprint ?? '—'}</td>
              <td className="px-4 py-3">
                <BlockerChain
                  chain={[
                    {
                      taskKey: task.taskKey,
                      title: task.title,
                      status: task.status,
                      depth: 1,
                    },
                  ]}
                />
              </td>
              <td className="px-4 py-3 font-mono text-muted-foreground">
                {task.estimateUnblockMs != null ? formatAge(task.estimateUnblockMs) : '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onViewTask(task.taskKey)}
                    className="border-2 border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-colors"
                  >
                    View task
                  </button>
                  <button
                    type="button"
                    onClick={() => onReassignBlocker(task.taskKey)}
                    className="border-2 border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-colors"
                  >
                    Reassign
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
