import { useEffect, useState } from 'react'
import { FileText, Calendar, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Retrospective {
  _id: string
  name: string
  status: string
  triggeredBy: string
  createdAt: number
  completedAt?: number
}

interface RetrospectiveListProps {
  onSelect: (id: string) => void
  onGenerate: () => void
  generating: boolean
}

/**
 * Fetches and displays list of past retrospectives with generate button
 */
export function RetrospectiveList({ onSelect, onGenerate, generating }: RetrospectiveListProps) {
  const [retros, setRetros] = useState<Retrospective[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/retrospectives?limit=50')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load retrospectives')
        return res.json()
      })
      .then(data => {
        setRetros(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      })
  }, [generating])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          <p className="mt-2 text-sm">Loading retrospectives...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-500">
          <AlertCircle className="mx-auto h-6 w-6" />
          <p className="mt-2 text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Past Retrospectives</h2>
        <Button onClick={onGenerate} disabled={generating} size="sm">
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate New
        </Button>
      </div>

      {retros.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2 text-sm">No retrospectives yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {retros.map(retro => (
            <Card
              key={retro._id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => onSelect(retro._id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{retro.name}</CardTitle>
                  <StatusBadge status={retro.status} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(retro.createdAt).toLocaleDateString()}
                  </span>
                  <span className="uppercase tracking-wider">{retro.triggeredBy}</span>
                  {retro.completedAt && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {new Date(retro.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Renders status badge with icon and color for retrospective status
 */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; className: string }> = {
    pending: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: 'bg-yellow-500/10 text-yellow-500',
    },
    running: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: 'bg-blue-500/10 text-blue-500',
    },
    completed: {
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-green-500/10 text-green-500',
    },
    failed: { icon: <AlertCircle className="h-3 w-3" />, className: 'bg-red-500/10 text-red-500' },
  }

  const config = map[status] ?? map.pending

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${config.className}`}
    >
      {config.icon}
      {status}
    </span>
  )
}
