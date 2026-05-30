import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Renders a panel section
 * @param title - The panel title
 * @param status - The status (success or failed)
 * @param subtitle - The subtitle text
 * @param output - The output content
 * @param error - Optional error message
 */
export function ResultPanel({
  title,
  status,
  subtitle,
  output,
  error,
}: {
  title: string
  status: 'success' | 'failed'
  subtitle: string
  output: string
  error?: string
}) {
  const statusClasses =
    status === 'success'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      : 'border-red-500/30 bg-red-500/10 text-red-200'

  return (
    <Card className="border-border/60 bg-background/70">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          <span
            className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.2em] ${statusClasses}`}
          >
            {status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        <pre className="max-h-56 overflow-auto rounded-2xl border border-border/60 bg-black/30 p-4 text-sm text-muted-foreground">
          {output || 'No output'}
        </pre>
      </CardContent>
    </Card>
  )
}
