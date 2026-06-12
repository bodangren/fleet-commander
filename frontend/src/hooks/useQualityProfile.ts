import { useCallback, useEffect, useState } from 'react'

/** Summary of a quality profile version returned by the list endpoint. */
export interface QualityProfileSummary {
  name: string
  version: number
  kind: 'none' | 'standard' | 'strict'
  description: string
  stages: Array<{
    kind: string
    policy: {
      required: boolean
      role: string
      attempts: number
      timeoutMs: number
    }
  }>
}

/** Effective profile resolution result from the backend. */
export interface EffectiveProfile {
  profileName: string
  profileVersion: number
  source: 'default' | 'project' | 'task-override'
}

interface UseQualityProfileReturn {
  profiles: QualityProfileSummary[] | undefined
  effectiveProjectProfile: EffectiveProfile | undefined
  effectiveTaskProfile: EffectiveProfile | undefined
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Loads quality profiles and effective project/task profile resolution
 * from the pivot REST API. Used by the settings surface and quality-run
 * views to bridge the frontend with the S1 Convex contract.
 *
 * @param projectSlug - Project identifier; when empty the hook is a no-op.
 * @param taskId - Optional task key; when provided the hook also resolves
 *   the effective task profile (task-override > project > default).
 */
export function useQualityProfile(projectSlug: string, taskId?: string): UseQualityProfileReturn {
  const [profiles, setProfiles] = useState<QualityProfileSummary[] | undefined>(undefined)
  const [effectiveProjectProfile, setEffectiveProjectProfile] = useState<
    EffectiveProfile | undefined
  >(undefined)
  const [effectiveTaskProfile, setEffectiveTaskProfile] = useState<EffectiveProfile | undefined>(
    undefined,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!projectSlug) return
    setLoading(true)
    setError(null)
    try {
      const profileRes = await fetch('/api/quality/profiles')
      if (!profileRes.ok) {
        const body = (await profileRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Failed to load quality profiles (${profileRes.status})`)
      }
      const profileData = (await profileRes.json()) as QualityProfileSummary[]
      setProfiles(profileData)

      const projectRes = await fetch(`/api/quality/projects/${projectSlug}/profile`)
      if (projectRes.ok) {
        setEffectiveProjectProfile((await projectRes.json()) as EffectiveProfile)
      }

      if (taskId) {
        const taskRes = await fetch(`/api/quality/projects/${projectSlug}/tasks/${taskId}/profile`)
        if (taskRes.ok) {
          setEffectiveTaskProfile((await taskRes.json()) as EffectiveProfile)
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Failed to load quality profiles')
      }
    } finally {
      setLoading(false)
    }
  }, [projectSlug, taskId])

  useEffect(() => {
    if (!projectSlug) {
      setLoading(false)
      return
    }
    void fetchData()
  }, [projectSlug, fetchData])

  return {
    profiles,
    effectiveProjectProfile,
    effectiveTaskProfile,
    loading,
    error,
    refresh: fetchData,
  }
}
