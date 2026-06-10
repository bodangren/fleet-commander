import { useCallback, useMemo, useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/lib/toast'
import { useNotificationPreferences, type NotificationPreferenceEntry } from '@/lib/useConvexData'

const inputClass =
  'w-full rounded-xl border border-border/60 bg-black/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30'

const NOTIFICATION_USER_ID = 'admin:system'

type PrefView = {
  muteAll: boolean
  inAppEnabled: boolean
  webhookEnabled: boolean
  webhookUrl: string
  emailEnabled: boolean
  email: string
}

const DEFAULT_PREFS: PrefView = {
  muteAll: false,
  inAppEnabled: true,
  webhookEnabled: false,
  webhookUrl: '',
  emailEnabled: false,
  email: '',
}

/**
 * Project a Convex preference entry onto the local form shape.
 */
function projectPrefs(entry: NotificationPreferenceEntry | null | undefined): PrefView {
  if (!entry) return DEFAULT_PREFS
  return {
    muteAll: entry.muteAll,
    inAppEnabled: entry.inAppEnabled,
    webhookEnabled: entry.webhookEnabled,
    webhookUrl: entry.webhookUrl ?? '',
    emailEnabled: entry.emailEnabled,
    email: entry.email ?? '',
  }
}

/**
 * Wrapper for a labeled form field with optional description.
 */
function FieldGroup({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </div>
  )
}

/**
 * Notification preferences section with optimistic updates and rollback on failure.
 * The Convex query is the single source of truth; local overrides are merged on top
 * only while an in-flight mutation is pending. On success the override is cleared and
 * the next query result takes over; on failure the override is discarded.
 */
export function NotificationSettingsSection() {
  const remote = useNotificationPreferences(NOTIFICATION_USER_ID)
  const [override, setOverride] = useState<PrefView | null>(null)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const view = useMemo<PrefView>(() => override ?? projectPrefs(remote), [override, remote])

  const persist = useCallback(
    async (next: PrefView, previous: PrefView) => {
      setOverride(next)
      setSaving(true)
      try {
        const res = await fetch('/api/notifications/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: NOTIFICATION_USER_ID,
            muteAll: next.muteAll,
            inAppEnabled: next.inAppEnabled,
            webhookEnabled: next.webhookEnabled,
            webhookUrl: next.webhookUrl || undefined,
            emailEnabled: next.emailEnabled,
            email: next.email || undefined,
          }),
        })
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) throw new Error(payload.error ?? 'Failed to save preferences')
        showToast('success', 'Notification preferences saved.')
        setOverride(null)
      } catch (e) {
        setOverride(previous)
        showToast('error', e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setSaving(false)
      }
    },
    [showToast],
  )

  const update = useCallback(
    (patch: Partial<PrefView>) => {
      const previous = view
      const next = { ...view, ...patch }
      void persist(next, previous)
    },
    [persist, view],
  )

  const remoteUnavailable = remote === null
  const stillLoading = remote === undefined

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Channel preferences and delivery settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {remoteUnavailable ? (
          <p className="text-xs text-muted-foreground">
            Convex is not configured — changes will not be persisted.
          </p>
        ) : null}
        {stillLoading ? (
          <p className="text-xs text-muted-foreground">Loading preferences...</p>
        ) : null}

        <FieldGroup label="Mute All" description="Temporarily disable all notifications.">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={view.muteAll}
              disabled={saving || stillLoading}
              onChange={e => update({ muteAll: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-xs">Mute all notifications</span>
          </label>
        </FieldGroup>

        <FieldGroup label="In-App" description="Show notifications inside the Fleet Commander UI.">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={view.inAppEnabled}
              disabled={saving || stillLoading}
              onChange={e => update({ inAppEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-xs">Enable in-app notifications</span>
          </label>
        </FieldGroup>

        <FieldGroup
          label="Webhook"
          description="POST JSON payload to a configured URL on each event."
        >
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={view.webhookEnabled}
              disabled={saving || stillLoading}
              onChange={e => update({ webhookEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-xs">Enable webhook delivery</span>
          </label>
          {view.webhookEnabled && (
            <input
              className={inputClass}
              value={view.webhookUrl}
              placeholder="https://example.com/webhook"
              disabled={saving}
              onChange={e => update({ webhookUrl: e.target.value })}
            />
          )}
        </FieldGroup>

        <FieldGroup label="Email" description="SMTP delivery for critical alerts.">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={view.emailEnabled}
              disabled={saving || stillLoading}
              onChange={e => update({ emailEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-xs">Enable email delivery</span>
          </label>
          {view.emailEnabled && (
            <input
              className={inputClass}
              value={view.email}
              placeholder="admin@example.com"
              disabled={saving}
              onChange={e => update({ email: e.target.value })}
            />
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
