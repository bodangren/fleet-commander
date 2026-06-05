import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface ProjectTemplateSummary {
  _id: string
  name: string
  description: string
  category: string
  taskCount: number
  estimatedBudget: number
}

/**
 * Card displaying a project template summary in the gallery
 * @param template - Template summary to display
 * @param onSelect - Optional callback when the card is clicked, receives template id
 */
export function TemplateCard({
  template,
  onSelect,
}: {
  template: ProjectTemplateSummary
  onSelect?: (templateId: string) => void
}) {
  return (
    <Card
      className="border-border/60 bg-background/60 border-4 cursor-pointer"
      role="button"
      aria-label={template.name}
      onClick={() => onSelect?.(template._id)}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{template.name}</CardTitle>
            <CardDescription className="text-xs">
              {template.description || 'No description'}
            </CardDescription>
          </div>
          <span className="border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground shrink-0">
            {template.category}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {template.taskCount} {template.taskCount === 1 ? 'task' : 'tasks'}
          </span>
          <span className="font-mono tabular-nums">
            ${template.estimatedBudget.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
