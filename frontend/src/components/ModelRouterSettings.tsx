import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { RoutingPolicy } from '@/lib/fleetTypes'

interface ModelRouterSettingsProps {
  currentPolicy?: RoutingPolicy
  onSave: (policy: RoutingPolicy) => Promise<void>
}

const POLICY_OPTIONS: Array<{ value: RoutingPolicy; label: string; description: string }> = [
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Optimize for the best mix of cost and quality. Recommended for most projects.',
  },
  {
    value: 'quality_first',
    label: 'Quality First',
    description: 'Minimize rejections and rework. Uses premium models more often.',
  },
  {
    value: 'cost_first',
    label: 'Cost First',
    description: 'Minimize spend. Uses cheaper models when historical quality is acceptable.',
  },
  {
    value: 'manual',
    label: 'Manual',
    description: "Use each agent's configured model. No automatic routing.",
  },
]

const selectClass =
  'w-full rounded-xl border border-border/60 bg-black/30 px-3 py-2 text-sm text-foreground appearance-none focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30'

/**
 * Settings panel for configuring the model routing policy per project.
 * Allows switching between quality_first, cost_first, balanced, and manual modes.
 */
export function ModelRouterSettings({ currentPolicy, onSave }: ModelRouterSettingsProps) {
  const [policy, setPolicy] = useState<RoutingPolicy>(currentPolicy ?? 'balanced')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSave = useCallback(async () => {
    setSaving(true)
    setToast(null)
    try {
      await onSave(policy)
      setToast({ type: 'success', message: 'Routing policy saved.' })
    } catch (e) {
      setToast({
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to save routing policy',
      })
    } finally {
      setSaving(false)
    }
  }, [policy, onSave])

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader>
        <CardTitle>Model Routing</CardTitle>
        <CardDescription>
          Configure how models are selected for each task. The router uses historical performance
          data to pick the optimal model based on your policy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {toast ? (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              toast.type === 'success'
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                : 'border-red-500/30 bg-red-500/10 text-red-100'
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Routing Policy</label>
          <p className="text-xs text-muted-foreground">
            Select how the router chooses models for task execution.
          </p>
          <select
            className={selectClass}
            value={policy}
            onChange={e => setPolicy(e.target.value as RoutingPolicy)}
          >
            {POLICY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-border/40 bg-black/20 p-3">
          <p className="text-xs text-muted-foreground">
            {POLICY_OPTIONS.find(o => o.value === policy)?.description}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void handleSave()} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save Policy'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
