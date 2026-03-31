import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { HarnessRecord } from '@/lib/fleetTypes'

type HarnessFormState = {
  name: string
  binary: string
  discoveryCommand: string
  parseStrategy: 'regex' | 'json' | 'line-per-model'
  pattern: string
  invocationTemplate: string
  flagsText: string
}

const defaultHarnessForm = (): HarnessFormState => ({
  name: '',
  binary: '',
  discoveryCommand: '',
  parseStrategy: 'line-per-model',
  pattern: '',
  invocationTemplate: '',
  flagsText: '{}',
})

function stringifyFlags(flags: Record<string, string> | undefined) {
  return JSON.stringify(flags ?? {}, null, 2)
}

function parseFlags(text: string) {
  if (!text.trim()) {
    return {}
  }
  const parsed = JSON.parse(text)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Harness flags must be a JSON object')
  }
  return parsed as Record<string, string>
}

function toHarnessPayload(form: HarnessFormState) {
  return {
    name: form.name,
    binary: form.binary,
    discovery: {
      command: form.discoveryCommand,
      parse_strategy: form.parseStrategy,
      pattern: form.pattern,
    },
    invocation: {
      template: form.invocationTemplate,
      flags: parseFlags(form.flagsText),
    },
  }
}

export type UseHarnessFormReturn = {
  form: HarnessFormState
  setName: (value: string) => void
  setBinary: (value: string) => void
  setDiscoveryCommand: (value: string) => void
  setParseStrategy: (value: 'regex' | 'json' | 'line-per-model') => void
  setPattern: (value: string) => void
  setInvocationTemplate: (value: string) => void
  setFlagsText: (value: string) => void
  resetForm: () => void
}

export function useHarnessForm(): UseHarnessFormReturn {
  const [form, setForm] = useState<HarnessFormState>(() => defaultHarnessForm())

  const setName = useCallback((value: string) => {
    setForm(prev => ({ ...prev, name: value }))
  }, [])

  const setBinary = useCallback((value: string) => {
    setForm(prev => ({ ...prev, binary: value }))
  }, [])

  const setDiscoveryCommand = useCallback((value: string) => {
    setForm(prev => ({ ...prev, discoveryCommand: value }))
  }, [])

  const setParseStrategy = useCallback((value: 'regex' | 'json' | 'line-per-model') => {
    setForm(prev => ({ ...prev, parseStrategy: value }))
  }, [])

  const setPattern = useCallback((value: string) => {
    setForm(prev => ({ ...prev, pattern: value }))
  }, [])

  const setInvocationTemplate = useCallback((value: string) => {
    setForm(prev => ({ ...prev, invocationTemplate: value }))
  }, [])

  const setFlagsText = useCallback((value: string) => {
    setForm(prev => ({ ...prev, flagsText: value }))
  }, [])

  const resetForm = useCallback(() => {
    setForm(defaultHarnessForm())
  }, [])

  return {
    form,
    setName,
    setBinary,
    setDiscoveryCommand,
    setParseStrategy,
    setPattern,
    setInvocationTemplate,
    setFlagsText,
    resetForm,
  }
}

export type UseHarnessLoaderReturn = {
  form: HarnessFormState
  scopeLayer: string
  loading: boolean
  error: string | null
  setName: (value: string) => void
  setBinary: (value: string) => void
  setDiscoveryCommand: (value: string) => void
  setParseStrategy: (value: 'regex' | 'json' | 'line-per-model') => void
  setPattern: (value: string) => void
  setInvocationTemplate: (value: string) => void
  setFlagsText: (value: string) => void
  resetForm: () => void
}

export function useHarnessLoader(name: string, projectQuery: string): UseHarnessLoaderReturn {
  const formHook = useHarnessForm()
  const [loading, setLoading] = useState(name !== 'new')
  const [error, setError] = useState<string | null>(null)
  const [scopeLayer, setScopeLayer] = useState<string>('new')

  useEffect(() => {
    let cancelled = false

    async function loadHarness() {
      if (name === 'new') {
        setLoading(false)
        setScopeLayer('new')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/harnesses/${encodeURIComponent(name)}${projectQuery}`)
        const payload = (await response.json()) as {
          layer?: string
          definition?: HarnessRecord['definition']
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load harness')
        }

        if (cancelled) {
          return
        }

        const definition = payload.definition
        if (!definition) {
          throw new Error('Harness payload missing definition')
        }

        formHook.setName(definition.name || name)
        formHook.setBinary(definition.binary ?? '')
        formHook.setDiscoveryCommand(definition.discovery?.command ?? '')
        formHook.setParseStrategy(
          definition.discovery?.parseStrategy === 'regex'
            ? 'regex'
            : definition.discovery?.parseStrategy === 'json'
              ? 'json'
              : 'line-per-model',
        )
        formHook.setPattern(definition.discovery?.pattern ?? '')
        formHook.setInvocationTemplate(definition.invocation?.template ?? '')
        formHook.setFlagsText(stringifyFlags(definition.invocation?.flags))
        setScopeLayer(payload.layer ?? 'user')
      } catch (loadError) {
        if (cancelled) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load harness')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadHarness()

    return () => {
      cancelled = true
    }
  }, [name, projectQuery])

  return {
    form: formHook.form,
    scopeLayer,
    loading,
    error,
    setName: formHook.setName,
    setBinary: formHook.setBinary,
    setDiscoveryCommand: formHook.setDiscoveryCommand,
    setParseStrategy: formHook.setParseStrategy,
    setPattern: formHook.setPattern,
    setInvocationTemplate: formHook.setInvocationTemplate,
    setFlagsText: formHook.setFlagsText,
    resetForm: formHook.resetForm,
  }
}

export type UseHarnessActionsReturn = {
  saving: boolean
  discoveryLoading: boolean
  discoveryResult: string[]
  discoveryError: string | null
  error: string | null
  handleSave: () => void
  handleDiscovery: () => void
  handleReset: () => void
  handleDelete: () => void
}

export function useHarnessActions(
  form: HarnessFormState,
  name: string,
  projectQuery: string,
  navigate: ReturnType<typeof useNavigate>,
  onFormNameUpdate: (newName: string) => void,
): UseHarnessActionsReturn {
  const [saving, setSaving] = useState(false)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [discoveryResult, setDiscoveryResult] = useState<string[]>([])
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    const targetName = name === 'new' ? form.name.trim() : name
    if (!targetName) {
      setError('Harness name is required before saving.')
      return
    }
    if (!form.binary.trim()) {
      setError('Harness binary is required')
      return
    }
    if (!form.discoveryCommand.trim()) {
      setError('Discovery command is required')
      return
    }
    if (!form.invocationTemplate.trim()) {
      setError('Invocation template is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/harnesses/${encodeURIComponent(targetName)}${projectQuery}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(toHarnessPayload(form)),
        },
      )
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to save harness')
      }

      if (name === 'new' || targetName !== name) {
        navigate(`/harnesses/${encodeURIComponent(targetName)}/edit${projectQuery}`)
      } else {
        onFormNameUpdate(targetName)
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save harness')
    } finally {
      setSaving(false)
    }
  }, [form, name, projectQuery, navigate, onFormNameUpdate])

  const handleDiscovery = useCallback(async () => {
    const targetName = name === 'new' ? form.name.trim() : name
    if (!targetName) {
      setDiscoveryError('Save or name the harness before testing discovery')
      return
    }

    setDiscoveryLoading(true)
    setDiscoveryError(null)

    try {
      const response = await fetch(
        `/api/harnesses/${encodeURIComponent(targetName)}/models${projectQuery}`,
      )
      const payload = (await response.json()) as { models?: string[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to test discovery')
      }
      setDiscoveryResult(payload.models ?? [])
    } catch (discoveryLoadError) {
      setDiscoveryResult([])
      setDiscoveryError(
        discoveryLoadError instanceof Error
          ? discoveryLoadError.message
          : 'Failed to test discovery',
      )
    } finally {
      setDiscoveryLoading(false)
    }
  }, [name, form.name, projectQuery])

  const handleReset = useCallback(async () => {
    const confirmed = window.confirm(`Reset ${name} to the bundled default?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(
        `/api/harnesses/${encodeURIComponent(name)}${projectQuery}/reset`,
        {
          method: 'POST',
        },
      )
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to reset harness')
      }
      navigate(`/harnesses${projectQuery}`)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset harness')
    }
  }, [name, projectQuery, navigate])

  const handleDelete = useCallback(async () => {
    const confirmed = window.confirm(`Delete ${name}?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/harnesses/${encodeURIComponent(name)}${projectQuery}`, {
        method: 'DELETE',
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete harness')
      }
      navigate(`/harnesses${projectQuery}`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete harness')
    }
  }, [name, projectQuery, navigate])

  return {
    saving,
    discoveryLoading,
    discoveryResult,
    discoveryError,
    error,
    handleSave,
    handleDiscovery,
    handleReset,
    handleDelete,
  }
}
