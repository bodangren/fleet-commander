import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { RetrospectiveList } from '@/components/retrospective/RetrospectiveList'
import { RetrospectiveViewer } from '@/components/retrospective/RetrospectiveViewer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * AI-generated sprint retrospectives with generate and view functionality
 */
export function RetrospectivePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [sprintIdInput, setSprintIdInput] = useState('')
  const [showForm, setShowForm] = useState(false)

  const handleGenerate = async () => {
    if (!sprintIdInput.trim()) return
    setGenerating(true)
    setGenerateError('')
    try {
      const res = await fetch('/api/retrospectives/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sprintId: sprintIdInput.trim(), triggeredBy: 'manual' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenerateError(data.error || 'Generation failed')
      } else {
        setSelectedId(data._id)
        setShowForm(false)
        setSprintIdInput('')
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
    }
  }

  if (selectedId) {
    return <RetrospectiveViewer id={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retrospectives</h1>
          <p className="text-muted-foreground">
            AI-generated sprint retrospectives with patterns, blockers, and improvement suggestions.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(s => !s)}>
          <FileText className="mr-2 h-4 w-4" />
          {showForm ? 'Cancel' : 'Generate'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate Retrospective</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Enter Sprint ID"
                value={sprintIdInput}
                onChange={e => setSprintIdInput(e.target.value)}
                className="max-w-md"
              />
              <Button onClick={handleGenerate} disabled={generating || !sprintIdInput.trim()}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
            {generateError && <p className="text-sm text-red-500">{generateError}</p>}
          </CardContent>
        </Card>
      )}

      <RetrospectiveList
        onSelect={setSelectedId}
        onGenerate={() => setShowForm(true)}
        generating={generating}
      />
    </section>
  )
}
