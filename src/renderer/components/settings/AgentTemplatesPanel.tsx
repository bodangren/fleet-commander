import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AgentTemplate } from '../../../shared/agent-templates'

const EMPTY_STATE_COPY = 'No agent templates yet. Add one to get started.'

export function AgentTemplatesPanel() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<AgentTemplate | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    name?: string
    command?: string
  }>({})

  const isEditing = useMemo(() => editingIndex !== null, [editingIndex])

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

  const beginAdd = () => {
    setDraft({ name: '', command: '' })
    setEditingIndex(null)
    setSaveError(null)
    setValidationErrors({})
  }

  const beginEdit = (index: number) => {
    const template = templates[index]
    if (!template) {
      return
    }
    setDraft({ ...template })
    setEditingIndex(index)
    setSaveError(null)
    setValidationErrors({})
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditingIndex(null)
    setSaveError(null)
    setValidationErrors({})
  }

  const handleSave = async () => {
    if (!draft) {
      return
    }
    if (!window.settingsApi) {
      setSaveError('Settings API is unavailable.')
      return
    }
    const nextDraft = { name: draft.name.trim(), command: draft.command.trim() }
    const nextErrors: { name?: string; command?: string } = {}
    if (!nextDraft.name) {
      nextErrors.name = 'Name is required.'
    }
    if (!nextDraft.command) {
      nextErrors.command = 'Command is required.'
    } else if (!nextDraft.command.includes('{{task}}')) {
      nextErrors.command = 'Command must include {{task}}.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors)
      return
    }
    const nextTemplates = isEditing
      ? templates.map((template, index) =>
          index === editingIndex ? nextDraft : template,
        )
      : [...templates, nextDraft]

    setIsSaving(true)
    setSaveError(null)
    setValidationErrors({})
    try {
      const response = await window.settingsApi.setAgentTemplates({ templates: nextTemplates })
      if (response.ok) {
        setTemplates(nextTemplates)
        setDraft(null)
        setEditingIndex(null)
      } else {
        setSaveError(response.error.message)
      }
    } catch {
      setSaveError('Failed to save agent template.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (index: number) => {
    if (!window.settingsApi) {
      setSaveError('Settings API is unavailable.')
      return
    }
    const nextTemplates = templates.filter((_, templateIndex) => templateIndex !== index)
    setIsSaving(true)
    setSaveError(null)
    try {
      const response = await window.settingsApi.setAgentTemplates({ templates: nextTemplates })
      if (response.ok) {
        setTemplates(nextTemplates)
        if (editingIndex === index) {
          setDraft(null)
          setEditingIndex(null)
        }
      } else {
        setSaveError(response.error.message)
      }
    } catch {
      setSaveError('Failed to save agent template.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-3 rounded border border-dashed border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] uppercase text-muted-foreground">
            LLM Agent Command Templates
          </p>
          <h3 className="text-sm font-semibold text-foreground">Templates</h3>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={beginAdd}
          disabled={isLoading}
        >
          Add template
        </Button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading templates...</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {draft ? (
        <div className="space-y-3 rounded border border-border bg-background px-3 py-3">
          <p className="text-xs font-semibold text-foreground">
            {isEditing ? 'Edit template' : 'Add template'}
          </p>
          <div className="space-y-2">
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="template-name"
              >
                Template name
              </label>
              <input
                id="template-name"
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
                value={draft.name}
                onChange={event => {
                  setDraft(current =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                  if (validationErrors.name) {
                    setValidationErrors(current => ({ ...current, name: undefined }))
                  }
                }}
              />
              {validationErrors.name ? (
                <p className="text-xs text-destructive">{validationErrors.name}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="template-command"
              >
                Command
              </label>
              <textarea
                id="template-command"
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
                rows={3}
                value={draft.command}
                onChange={event => {
                  setDraft(current =>
                    current ? { ...current, command: event.target.value } : current,
                  )
                  if (validationErrors.command) {
                    setValidationErrors(current => ({ ...current, command: undefined }))
                  }
                }}
              />
              {validationErrors.command ? (
                <p className="text-xs text-destructive">{validationErrors.command}</p>
              ) : null}
            </div>
          </div>
          {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              Save template
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {!isLoading && !error ? (
        templates.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="settings-templates-empty">
            {EMPTY_STATE_COPY}
          </p>
        ) : (
          <div className="space-y-2" data-testid="settings-templates-list">
            {templates.map((template, index) => (
              <div
                key={`${template.name}-${index}`}
                className="rounded border border-border bg-background px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{template.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{template.command}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit template ${template.name}`}
                      onClick={() => beginEdit(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete template ${template.name}`}
                      onClick={() => handleDelete(index)}
                      disabled={isSaving}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </section>
  )
}
