import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useToast } from '@/lib/toast'
import { useQualityProfile } from '@/hooks/useQualityProfile'

const selectClass =
  'w-full rounded-xl border border-border/60 bg-black/30 px-3 py-2 text-sm text-foreground appearance-none focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30'

function FieldGroup({
  label,
  description,
  controlId,
  children,
}: {
  label: string
  description?: string
  controlId: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={controlId}>
        {label}
      </label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </div>
  )
}

/**
 * Project settings section for selecting and inspecting quality workflow
 * profiles. Reuses the established Card/FieldGroup pattern from
 * AgentDefaultsSection and other settings surfaces.
 */
export function QualityProfileSection({ projectSlug }: { projectSlug: string }) {
  const { profiles, effectiveProjectProfile, loading, error, refresh } =
    useQualityProfile(projectSlug)
  const { showToast } = useToast()

  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const currentName = selectedName ?? effectiveProjectProfile?.profileName ?? ''

  const allProfileNames = profiles?.map(p => p.name) ?? []
  const selectedProfile = profiles?.find(p => p.name === currentName) ?? null
  const isDirty = currentName !== (effectiveProjectProfile?.profileName ?? 'none')

  const handleSave = useCallback(async () => {
    if (!currentName) return
    setSaving(true)
    setSaveError(null)
    try {
      const profileVersion = selectedProfile?.version ?? 1
      const res = await fetch(`/api/quality/projects/${projectSlug}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileName: currentName,
          profileVersion,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Save failed (${res.status})`)
      }
      showToast('success', 'Quality profile saved.')
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }, [selectedProfile, projectSlug, showToast, refresh])

  if (error) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <h3 className="font-semibold leading-none tracking-tight">Quality workflow</h3>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-red-200">Failed to load quality profiles</p>
        </CardContent>
      </Card>
    )
  }

  if (loading || !profiles || !effectiveProjectProfile) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <h3 className="font-semibold leading-none tracking-tight">Quality workflow</h3>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Loading quality profiles...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader>
        <h3 className="font-semibold leading-none tracking-tight">Quality workflow</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup label="Profile" controlId="quality-profile-select">
          <select
            id="quality-profile-select"
            className={selectClass}
            value={currentName}
            onChange={e => {
              setSelectedName(e.target.value)
              setSaveError(null)
            }}
          >
            {(profiles ?? []).map(p => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
            {!allProfileNames.includes('unknown') && <option value="unknown">unknown</option>}
          </select>
        </FieldGroup>

        {effectiveProjectProfile && (
          <div
            data-testid="quality-profile-version-badge"
            className="text-xs text-muted-foreground"
          >
            v{effectiveProjectProfile.profileVersion}
          </div>
        )}

        {selectedProfile && selectedProfile.stages.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Stages</p>
            <ol data-testid="quality-profile-stages" className="space-y-1">
              {selectedProfile.stages.map((stage, i) => (
                <li key={`${stage.kind}-${i}`} className="text-xs text-muted-foreground">
                  {stage.kind}
                  {stage.policy.required ? '' : ' (optional)'}
                </li>
              ))}
            </ol>
          </div>
        )}

        {saveError && <p className="text-xs text-red-200">{saveError}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => void refresh()}>
            Refresh
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !isDirty}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
