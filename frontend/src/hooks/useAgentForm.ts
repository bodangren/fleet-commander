import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { AgentRecord, AgentTestResult, HarnessRecord } from '@/lib/fleetTypes'

type AgentFormState = {
  name: string
  description: string
  mode: 'agent' | 'subagent'
  harness: string
  model: string
  temperature: string
  tools: {
    write: boolean
    edit: boolean
    bash: boolean
  }
  body: string
}

export type AgentFormValidationError = {
  field: string
  message: string
}

export type AgentFormValidationResult = {
  valid: boolean
  errors: AgentFormValidationError[]
}

/**
 * Validates agent form data and returns field-level errors
 */
export function validateAgentForm(data: {
  name: string
  provider: string
  model: string
}): AgentFormValidationResult {
  const errors: AgentFormValidationError[] = []

  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Agent name is required' })
  }
  if (!data.provider.trim()) {
    errors.push({ field: 'provider', message: 'Select a harness before saving' })
  }
  if (!data.model.trim()) {
    errors.push({ field: 'model', message: 'Select a model before saving' })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }
  return { valid: true, errors: [] }
}

/**
 * Returns default agent form state
 */
const defaultAgentForm = (): AgentFormState => ({
  name: '',
  description: '',
  mode: 'agent',
  harness: '',
  model: '',
  temperature: '0.2',
  tools: {
    write: true,
    edit: true,
    bash: true,
  },
  body: '',
})

/**
 * Splits model string into harness and model parts
 */
function splitModel(value: string) {
  const slashIndex = value.indexOf('/')
  if (slashIndex === -1) {
    return { harness: '', model: value }
  }
  return {
    harness: value.slice(0, slashIndex),
    model: value.slice(slashIndex + 1),
  }
}

/**
 * Converts name to lowercase slug with hyphens
 */
function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Builds agent payload object from form state
 */
function makeAgentPayload(form: AgentFormState) {
  return {
    description: form.description,
    mode: form.mode,
    model: `${form.harness}/${form.model}`.replace(/^\/|\/$/g, ''),
    temperature: Number(form.temperature),
    tools: form.tools,
    body: form.body,
  }
}

export type UseAgentFormReturn = {
  form: AgentFormState
  initialForm: AgentFormState
  dirty: boolean
  setName: (value: string) => void
  setDescription: (value: string) => void
  setMode: (value: 'agent' | 'subagent') => void
  setHarness: (value: string) => void
  setModel: (value: string) => void
  setTemperature: (value: string) => void
  toggleTool: (tool: 'write' | 'edit' | 'bash', checked: boolean) => void
  setBody: (value: string) => void
  resetForm: () => void
  snapshotInitial: () => void
}

/**
 * Manages agent form state with setters for all fields
 */
export function useAgentForm(): UseAgentFormReturn {
  const [form, setForm] = useState<AgentFormState>(() => defaultAgentForm())
  const [initialForm, setInitialForm] = useState<AgentFormState>(() => defaultAgentForm())

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  )

  const setName = useCallback((value: string) => {
    setForm(prev => ({ ...prev, name: value }))
  }, [])

  const setDescription = useCallback((value: string) => {
    setForm(prev => ({ ...prev, description: value }))
  }, [])

  const setMode = useCallback((value: 'agent' | 'subagent') => {
    setForm(prev => ({ ...prev, mode: value }))
  }, [])

  const setHarness = useCallback((value: string) => {
    setForm(prev => ({ ...prev, harness: value, model: '' }))
  }, [])

  const setModel = useCallback((value: string) => {
    setForm(prev => ({ ...prev, model: value }))
  }, [])

  const setTemperature = useCallback((value: string) => {
    setForm(prev => ({ ...prev, temperature: value }))
  }, [])

  const toggleTool = useCallback((tool: 'write' | 'edit' | 'bash', checked: boolean) => {
    setForm(prev => ({
      ...prev,
      tools: { ...prev.tools, [tool]: checked },
    }))
  }, [])

  const setBody = useCallback((value: string) => {
    setForm(prev => ({ ...prev, body: value }))
  }, [])

  const resetForm = useCallback(() => {
    setForm(defaultAgentForm())
    setInitialForm(defaultAgentForm())
  }, [])

  const snapshotInitial = useCallback(() => {
    setInitialForm(prev => {
      const current = JSON.stringify(form)
      const initial = JSON.stringify(prev)
      if (current !== initial) {
        return { ...form }
      }
      return prev
    })
  }, [form])

  return {
    form,
    initialForm,
    dirty,
    setName,
    setDescription,
    setMode,
    setHarness,
    setModel,
    setTemperature,
    toggleTool,
    setBody,
    resetForm,
    snapshotInitial,
  }
}

export type UseAgentLoaderReturn = {
  form: AgentFormState
  scopeLayer: string
  loading: boolean
  error: string | null
  dirty: boolean
  setName: (value: string) => void
  setDescription: (value: string) => void
  setMode: (value: 'agent' | 'subagent') => void
  setHarness: (value: string) => void
  setModel: (value: string) => void
  setTemperature: (value: string) => void
  toggleTool: (tool: 'write' | 'edit' | 'bash', checked: boolean) => void
  setBody: (value: string) => void
  resetForm: () => void
}

/**
 * Loads existing agent definition into form state by name
 */
export function useAgentLoader(name: string, projectQuery: string): UseAgentLoaderReturn {
  const formHook = useAgentForm()
  const [loading, setLoading] = useState(name !== 'new')
  const [error, setError] = useState<string | null>(null)
  const [scopeLayer, setScopeLayer] = useState<string>('new')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadAgent() {
      if (name === 'new') {
        setLoading(false)
        setScopeLayer('new')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/agents/${encodeURIComponent(name)}${projectQuery}`)
        const payload = (await response.json()) as {
          layer?: string
          definition?: AgentRecord['definition']
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load agent')
        }

        if (cancelled) {
          return
        }

        const definition = payload.definition
        if (!definition) {
          throw new Error('Agent payload missing definition')
        }

        const split = splitModel(definition.model)
        formHook.setName(definition.name || name)
        formHook.setDescription(definition.description ?? '')
        formHook.setMode(definition.mode === 'subagent' ? 'subagent' : 'agent')
        formHook.setHarness(split.harness)
        formHook.setModel(split.model)
        formHook.setTemperature(String(definition.temperature ?? 0.2))
        formHook.toggleTool('write', Boolean(definition.tools?.write))
        formHook.toggleTool('edit', Boolean(definition.tools?.edit))
        formHook.toggleTool('bash', Boolean(definition.tools?.bash))
        formHook.setBody(definition.body ?? '')
        setScopeLayer(payload.layer ?? 'user')
        setLoaded(true)
      } catch (loadError) {
        if (cancelled) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load agent')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadAgent()

    return () => {
      cancelled = true
    }
  }, [name, projectQuery])

  useEffect(() => {
    if (loaded && !loading) {
      formHook.snapshotInitial()
      setLoaded(false)
    }
  }, [loaded, loading, formHook.snapshotInitial])

  return {
    form: formHook.form,
    scopeLayer,
    loading,
    error,
    dirty: formHook.dirty,
    setName: formHook.setName,
    setDescription: formHook.setDescription,
    setMode: formHook.setMode,
    setHarness: formHook.setHarness,
    setModel: formHook.setModel,
    setTemperature: formHook.setTemperature,
    toggleTool: formHook.toggleTool,
    setBody: formHook.setBody,
    resetForm: formHook.resetForm,
  }
}

export type UseHarnessListReturn = {
  harnesses: HarnessRecord[]
  harnessNames: string[]
  error: string | null
}

/**
 * Fetches list of harnesses for the current project
 */
export function useHarnessList(projectQuery: string): UseHarnessListReturn {
  const [harnesses, setHarnesses] = useState<HarnessRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadHarnesses() {
      try {
        const response = await fetch(`/api/harnesses${projectQuery}`)
        const payload = (await response.json()) as HarnessRecord[] | { error?: string }
        if (!response.ok) {
          const message =
            !Array.isArray(payload) && payload.error ? payload.error : 'Failed to load harnesses'
          throw new Error(message)
        }

        if (!cancelled) {
          setHarnesses(Array.isArray(payload) ? payload : [])
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load harnesses')
        }
      }
    }

    void loadHarnesses()

    return () => {
      cancelled = true
    }
  }, [projectQuery])

  const harnessNames = useMemo(() => {
    const names = new Set<string>()
    for (const harness of harnesses) {
      if (harness.definition.name) {
        names.add(harness.definition.name)
      }
    }
    return Array.from(names).sort((left, right) => left.localeCompare(right))
  }, [harnesses])

  return { harnesses, harnessNames, error }
}

export type UseModelDiscoveryReturn = {
  availableModels: string[]
  modelOptions: string[]
  modelLoading: boolean
  modelError: string | null
}

/**
 * Discovers available models for a given harness via API
 */
export function useModelDiscovery(
  harness: string,
  projectQuery: string,
  currentModel: string,
  setModel: (value: string) => void,
): UseModelDiscoveryReturn {
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadModels() {
      if (!harness) {
        setAvailableModels([])
        setModelError(null)
        setModelLoading(false)
        return
      }

      setModelLoading(true)
      setModelError(null)

      try {
        const response = await fetch(
          `/api/harnesses/${encodeURIComponent(harness)}/models${projectQuery}`,
        )
        const payload = (await response.json()) as { models?: string[]; error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to discover models')
        }

        if (!cancelled) {
          const models = payload.models ?? []
          setAvailableModels(models)
          if (models.length > 0) {
            if (!currentModel || !models.includes(currentModel)) {
              setModel(models[0])
            }
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setAvailableModels([])
          setModelError(
            loadError instanceof Error ? loadError.message : 'Failed to discover models',
          )
        }
      } finally {
        if (!cancelled) {
          setModelLoading(false)
        }
      }
    }

    void loadModels()

    return () => {
      cancelled = true
    }
  }, [harness, projectQuery, currentModel, setModel])

  const modelOptions = useMemo(() => {
    const options = new Set<string>(availableModels)
    if (currentModel) {
      options.add(currentModel)
    }
    return Array.from(options)
  }, [availableModels, currentModel])

  return { availableModels, modelOptions, modelLoading, modelError }
}

export type UseAgentActionsReturn = {
  saving: boolean
  testing: boolean
  testResult: AgentTestResult | null
  error: string | null
  handleSave: () => Promise<void>
  handleClone: () => Promise<void>
  handleTestAgent: () => Promise<void>
  handleReset: () => Promise<void>
  handleDelete: () => Promise<void>
}

/**
 * Returns save/test/clone/delete handlers and state for agent form
 */
export function useAgentActions(
  form: AgentFormState,
  name: string,
  projectQuery: string,
  navigate: ReturnType<typeof useNavigate>,
  onFormNameUpdate: (newName: string) => void,
): UseAgentActionsReturn {
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<AgentTestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    const rawName = form.name.trim()
    const targetName = name === 'new' ? normalizeName(rawName) || rawName : rawName || name

    const validation = validateAgentForm({
      name: targetName,
      provider: form.harness,
      model: form.model,
    })
    if (!validation.valid) {
      setError(validation.errors[0].message)
      return
    }
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(targetName)}${projectQuery}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makeAgentPayload(form)),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to save agent')
      }

      if (name === 'new' || targetName !== name) {
        navigate(`/agents/${encodeURIComponent(targetName)}/edit${projectQuery}`)
      } else {
        onFormNameUpdate(targetName)
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save agent')
    } finally {
      setSaving(false)
    }
  }, [form, name, projectQuery, navigate, onFormNameUpdate])

  const handleClone = useCallback(async () => {
    const nextName = window.prompt('Clone as:', `${form.name || name}-copy`)
    if (!nextName) {
      return
    }

    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(name)}/clone${projectQuery}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: nextName }),
      })
      const payload = (await response.json()) as { error?: string; name?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to clone agent')
      }
      navigate(`/agents/${encodeURIComponent(payload.name ?? nextName)}/edit${projectQuery}`)
    } catch (cloneError) {
      setError(cloneError instanceof Error ? cloneError.message : 'Failed to clone agent')
    }
  }, [form.name, name, projectQuery, navigate])

  const handleTestAgent = useCallback(async () => {
    const targetName = name === 'new' ? form.name.trim() : name
    if (!targetName) {
      setError('Save the agent before running a test.')
      return
    }

    setTesting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/agents/${encodeURIComponent(targetName)}/test${projectQuery}`,
        {
          method: 'POST',
        },
      )
      const payload = (await response.json()) as AgentTestResult & {
        error?: string
        ok?: boolean
        message?: string
        readiness?: AgentTestResult['readiness']
      }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to run agent test')
      }

      const ready =
        payload.ok !== false &&
        !payload.error &&
        payload.readiness?.ok !== false &&
        (payload.status === 'success' || payload.status === 'ready')
      setTestResult({
        name: payload.name || targetName,
        ok: ready,
        status: ready ? 'success' : 'failed',
        latencyMs: payload.latencyMs ?? 0,
        output: ready ? (payload.output ?? payload.message ?? '') : '',
        error: ready
          ? undefined
          : (payload.error ?? payload.readiness?.reason ?? 'Pi readiness check failed'),
        readiness: payload.readiness,
      })
    } catch (testError) {
      setTestResult({
        name: targetName,
        status: 'failed',
        latencyMs: 0,
        output: '',
        error: testError instanceof Error ? testError.message : 'Failed to run agent test',
      })
    } finally {
      setTesting(false)
    }
  }, [name, form.name, projectQuery])

  const handleReset = useCallback(async () => {
    const confirmed = window.confirm(`Reset ${name} to the bundled default?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(name)}/reset${projectQuery}`, {
        method: 'POST',
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to reset agent')
      }
      navigate(`/agents${projectQuery}`)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset agent')
    }
  }, [name, projectQuery, navigate])

  const handleDelete = useCallback(async () => {
    const confirmed = window.confirm(`Delete ${name}?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(name)}${projectQuery}`, {
        method: 'DELETE',
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete agent')
      }
      navigate(`/agents${projectQuery}`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete agent')
    }
  }, [name, projectQuery, navigate])

  return {
    saving,
    testing,
    testResult,
    error,
    handleSave,
    handleClone,
    handleTestAgent,
    handleReset,
    handleDelete,
  }
}
