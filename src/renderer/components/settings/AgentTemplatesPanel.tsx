import { useEffect, useState } from 'react'
import type { AgentTemplate } from '../../../shared/agent-templates'

const EMPTY_STATE_COPY = 'No agent templates yet. Add one to get started.'

export function AgentTemplatesPanel() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.settingsApi) {
      setError('Settings API is unavailable.')
      return
    }

    let isActive = true
    setIsLoading(true)
    setError(null)

    window.settingsApi
      .getAgentTemplates()
      .then(response => {
        if (!isActive) {
          return
        }
        if (response.ok) {
          setTemplates(response.templates)
          setError(null)
        } else {
          setError(response.error.message)
        }
      })
      .catch(() => {
        if (isActive) {
          setError('Failed to load agent templates.')
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  return (
    <section className="space-y-3 rounded border border-dashed border-border bg-background/60 p-4">
      <div className="space-y-1">
        <p className="text-[11px] uppercase text-muted-foreground">LLM Agent Command Templates</p>
        <h3 className="text-sm font-semibold text-foreground">Templates</h3>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading templates...</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!isLoading && !error ? (
        templates.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="settings-templates-empty">
            {EMPTY_STATE_COPY}
          </p>
        ) : (
          <div className="space-y-2" data-testid="settings-templates-list">
            {templates.map(template => (
              <div
                key={template.name}
                className="rounded border border-border bg-background px-3 py-2"
              >
                <p className="text-xs font-semibold text-foreground">{template.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{template.command}</p>
              </div>
            ))}
          </div>
        )
      ) : null}
    </section>
  )
}
