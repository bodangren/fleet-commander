import { useCallback, useEffect, useState } from 'react'

export type AgentTemplate = {
  _id: string
  name: string
  role: string
  model: string
  temperature: number
  systemPrompt: string
  skills: string[]
  estimatedCostPer1kTokens: number
  createdAt: number
  updatedAt: number
}

export type TemplateFormPayload = {
  name: string
  role: string
  model: string
  temperature: number
  systemPrompt: string
  skills: string[]
  estimatedCostPer1kTokens: number
}

/**
 * Fetches and manages agent templates from the pivot API.
 * Wraps list, get, create, update, clone, delete, and seed-defaults flows.
 */
export function useAgentTemplates() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-templates')
      if (!res.ok) throw new Error('Failed to load templates')
      const data = (await res.json()) as AgentTemplate[]
      setTemplates(data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  const cloneTemplate = useCallback(
    async (id: string, newName: string) => {
      try {
        const res = await fetch(`/api/agent-templates/${id}/clone`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ newName }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string }
          throw new Error(body.message || 'Clone failed')
        }
        setError(null)
        await fetchTemplates()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Clone failed')
      }
    },
    [fetchTemplates],
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/agent-templates/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string }
          throw new Error(body.message || 'Delete failed')
        }
        setError(null)
        await fetchTemplates()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Delete failed')
      }
    },
    [fetchTemplates],
  )

  const seedDefaults = useCallback(async (): Promise<
    { ok: true } | { ok: false; error: string }
  > => {
    try {
      const res = await fetch('/api/agent-templates/seed-defaults', { method: 'POST' })
      if (!res.ok) throw new Error('Seed failed')
      setError(null)
      await fetchTemplates()
      return { ok: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Seed failed'
      setError(msg)
      return { ok: false, error: msg }
    }
  }, [fetchTemplates])

  const clearError = useCallback(() => setError(null), [])

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    cloneTemplate,
    deleteTemplate,
    seedDefaults,
    clearError,
  }
}

/**
 * Fetches and manages a single agent template for editing.
 * Wraps GET, POST/PUT, and DELETE for a single template.
 */
export function useAgentTemplateEditor(id: string) {
  const [template, setTemplate] = useState<AgentTemplate | null>(null)
  const [loading, setLoading] = useState(id !== 'new')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = id !== 'new'

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/agent-templates/${id}`)
        if (!res.ok) throw new Error('Template not found')
        const tmpl = (await res.json()) as AgentTemplate
        if (!cancelled) {
          setTemplate(tmpl)
          setError(null)
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  const saveTemplate = useCallback(
    async (payload: TemplateFormPayload) => {
      setSaving(true)
      setError(null)
      try {
        if (!payload.name) {
          setError('Name is required')
          setSaving(false)
          return false
        }

        const url = isEdit ? `/api/agent-templates/${id}` : '/api/agent-templates'
        const method = isEdit ? 'PATCH' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string }
          throw new Error(body.message || 'Save failed')
        }

        setSaving(false)
        return true
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Save failed')
        setSaving(false)
        return false
      }
    },
    [id, isEdit],
  )

  const deleteTemplate = useCallback(async () => {
    if (!isEdit) return false
    try {
      const res = await fetch(`/api/agent-templates/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message || 'Delete failed')
      }
      return true
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      return false
    }
  }, [id, isEdit])

  return {
    template,
    loading,
    saving,
    error,
    saveTemplate,
    deleteTemplate,
    setError,
  }
}
