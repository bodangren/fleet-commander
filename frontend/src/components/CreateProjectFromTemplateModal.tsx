import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'

export interface TemplateOption {
  _id: string
  name: string
  category: string
  taskCount: number
  estimatedBudget: number
}

/**
 * Modal for creating a new project, optionally from a template
 * @param templates - Available template options
 * @param loading - Whether templates are being loaded
 * @param error - Error message to display
 * @param onClose - Callback when the modal is closed
 * @param onCreate - Callback when the Create button is clicked with templateId + projectName
 */
export function CreateProjectFromTemplateModal({
  templates,
  loading,
  error,
  onClose,
  onCreate,
}: {
  templates: TemplateOption[]
  loading: boolean
  error: string | null
  onClose: () => void
  onCreate: (args: { templateId: string | null; projectName: string }) => void | Promise<void>
}) {
  const [projectName, setProjectName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const selectedTemplate = templates.find(t => t._id === selectedTemplateId) ?? null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = projectName.trim()
    if (!trimmed) return
    onCreate({
      templateId: selectedTemplateId || null,
      projectName: trimmed,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-lg border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_36%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] shadow-2xl shadow-cyan-950/20">
        <CardHeader className="space-y-2">
          <h2 className="text-lg font-semibold">Create Project</h2>
          <CardDescription>Start from scratch or pick a template.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading templates...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="project-name" className="text-xs text-muted-foreground">
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  aria-label="Project name"
                  placeholder="My Project"
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="template-select" className="text-xs text-muted-foreground">
                  Template
                </label>
                <select
                  id="template-select"
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  aria-label="Template"
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Empty project</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <div className="text-xs text-muted-foreground">
                  {selectedTemplate.taskCount} tasks &middot; $
                  {selectedTemplate.estimatedBudget.toFixed(2)}
                </div>
              )}

              {error && (
                <p className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-100">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!projectName.trim()}>
                  Create
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
