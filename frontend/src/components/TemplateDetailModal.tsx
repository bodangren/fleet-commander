import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface ProjectTemplateTask {
  title: string
  storyPoints: number
  priority: string
  status: string
  dependencies?: string[]
}

export interface ProjectTemplateAgent {
  role: string
  model: string
  skills: string[]
  costPerPoint: number
}

export interface ProjectTemplateDetail {
  _id: string
  name: string
  description: string
  category: string
  tasks: ProjectTemplateTask[]
  defaultAgents: ProjectTemplateAgent[]
  estimatedBudget: number
}

/**
 * Modal previewing a project template before creating a project from it
 * @param template - Template detail to display, null hides the modal
 * @param onClose - Callback when the modal is closed
 * @param onCreate - Callback when the Create button is clicked
 * @param creating - Whether a creation is in progress
 */
export function TemplateDetailModal({
  template,
  onClose,
  onCreate,
  creating,
}: {
  template: ProjectTemplateDetail | null
  onClose: () => void
  onCreate: (templateId: string) => void
  creating: boolean
}) {
  if (!template) return null

  const totalPoints = template.tasks.reduce((sum, t) => sum + t.storyPoints, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      data-testid="template-detail-backdrop"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        role="dialog"
        onClick={e => e.stopPropagation()}
      >
        <Card className="border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_36%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] shadow-2xl shadow-cyan-950/20">
          <CardHeader className="space-y-2">
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <CardDescription>{template.description}</CardDescription>
            <span className="inline-block border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground w-fit">
              {template.category}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Tasks</h4>
              {template.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    {template.tasks.length} {template.tasks.length === 1 ? 'task' : 'tasks'},{' '}
                    {totalPoints} {totalPoints === 1 ? 'point' : 'points'}
                  </p>
                  <ul className="space-y-1">
                    {template.tasks.map((task, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span>{task.title}</span>
                        <span className="text-muted-foreground text-xs">
                          {task.storyPoints} pts &middot; {task.priority}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Default Agents</h4>
              <ul className="space-y-1">
                {template.defaultAgents.map((agent, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span>{agent.role}</span>
                    <span className="text-muted-foreground text-xs">{agent.model}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-sm text-muted-foreground">Estimated Budget</span>
              <span className="font-mono tabular-nums">${template.estimatedBudget.toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button disabled={creating} onClick={() => onCreate(template._id)}>
                Create
              </Button>
              {creating && (
                <Button disabled>
                  Creating...
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
