import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import type { AnalysisResultEntry } from '../lib/useConvexData'

interface AnalysisResultsProps {
  results: AnalysisResultEntry[]
}

type SeverityFilter = 'all' | 'error' | 'warning' | 'info'

function SeverityBadge({ severity }: { severity: 'error' | 'warning' | 'info' }) {
  const colors = {
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[severity]}`} />
}

export function AnalysisResults({ results }: AnalysisResultsProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')

  const filteredResults = useMemo(() => {
    if (severityFilter === 'all') return results
    return results.filter((r) => r.severity === severityFilter)
  }, [results, severityFilter])

  const groupedByFile = useMemo(() => {
    const groups = new Map<string, AnalysisResultEntry[]>()
    for (const result of filteredResults) {
      const existing = groups.get(result.file) ?? []
      existing.push(result)
      groups.set(result.file, existing)
    }
    return Array.from(groups.entries())
      .map(([file, results]) => ({ file, results }))
      .sort((a, b) => {
        const aErrors = a.results.filter((r) => r.severity === 'error').length
        const bErrors = b.results.filter((r) => r.severity === 'error').length
        return bErrors - aErrors
      })
  }, [filteredResults])

  const errorCount = results.filter((r) => r.severity === 'error').length
  const warningCount = results.filter((r) => r.severity === 'warning').length
  const infoCount = results.filter((r) => r.severity === 'info').length

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No analysis results found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SeverityBadge severity="error" />
        <span className="text-sm">{errorCount} errors</span>
        <SeverityBadge severity="warning" />
        <span className="text-sm">{warningCount} warnings</span>
        <SeverityBadge severity="info" />
        <span className="text-sm">{infoCount} info</span>
      </div>

      <div className="flex gap-2">
        {(['all', 'error', 'warning', 'info'] as SeverityFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setSeverityFilter(filter)}
            className={`px-3 py-1 text-sm rounded-md ${
              severityFilter === filter
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {filter === 'all' ? 'All' : filter}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {groupedByFile.map(({ file, results: fileResults }) => (
          <Card key={file}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">{file}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fileResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-sm"
                  >
                    <SeverityBadge severity={result.severity} />
                    <span className="text-muted-foreground shrink-0">
                      {result.line}:{result.column}
                    </span>
                    <span className="flex-1">{result.message}</span>
                    {result.rule && (
                      <span className="text-muted-foreground shrink-0">[{result.rule}]</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
