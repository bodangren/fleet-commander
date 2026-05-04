import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MarkdownViewer } from '@/components/MarkdownViewer'

interface Retrospective {
  _id: string
  name: string
  status: string
  triggeredBy: string
  reportMarkdown?: string
  createdAt: number
  completedAt?: number
}

interface RetrospectiveViewerProps {
  id: string
  onBack: () => void
}

export function RetrospectiveViewer({ id, onBack }: RetrospectiveViewerProps) {
  const [retro, setRetro] = useState<Retrospective | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/retrospectives/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load retrospective')
        return res.json()
      })
      .then(data => {
        setRetro(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          <p className="mt-2 text-sm">Loading retrospective...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !retro) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-500">
          <AlertCircle className="mx-auto h-8 w-8" />
          <p className="mt-2 text-sm">{error || 'Retrospective not found'}</p>
          <Button variant="ghost" onClick={onBack} className="mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h2 className="text-xl font-bold tracking-tight">{retro.name}</h2>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="uppercase tracking-wider">{retro.status}</span>
        <span>Created {new Date(retro.createdAt).toLocaleString()}</span>
        {retro.completedAt && <span>Completed {new Date(retro.completedAt).toLocaleString()}</span>}
      </div>

      {retro.reportMarkdown ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report</CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownViewer value={retro.reportMarkdown} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-sm">
              {retro.status === 'pending' || retro.status === 'running'
                ? 'Report is being generated...'
                : 'No report available.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
