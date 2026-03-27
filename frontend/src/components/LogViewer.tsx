import { useEffect, useRef } from 'react'

interface LogViewerProps {
  lines: string[]
  connected?: boolean
  className?: string
}

export function LogViewer({ lines, connected = false, className = '' }: LogViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [lines])

  return (
    <div
      className={`rounded-lg bg-gray-950 p-4 font-mono text-sm text-green-400 ${className}`}
      aria-label="Log output"
    >
      <div className="mb-2 flex items-center gap-2 border-b border-gray-800 pb-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-gray-500'
          }`}
        />
        <span className="text-xs text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {lines.length === 0 ? (
        <p className="italic text-gray-600">No output yet...</p>
      ) : (
        lines.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-all leading-relaxed">
            {line}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
