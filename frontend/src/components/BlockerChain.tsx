type BlockerChainEntry = {
  taskKey: string
  title: string
  status: string
  depth: number
}

type BlockerChainProps = {
  chain: BlockerChainEntry[]
}

const statusDotColors: Record<string, string> = {
  done: '#27a644',
  in_progress: '#5e6ad2',
  ready: '#8a8f98',
  blocked: '#eab308',
  backlog: '#62666d',
}

/**
 * Visual breadcrumb showing a chain of blocking tasks with status badges
 */
export function BlockerChain({ chain }: BlockerChainProps) {
  if (chain.length === 0) return null

  const sorted = [...chain].sort((a, b) => a.depth - b.depth)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {sorted.map((entry, i) => (
        <div key={entry.taskKey} className="flex items-center gap-1">
          {i > 0 && <span className="text-[10px] text-[#62666d]">&rarr;</span>}
          <span
            className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border"
            style={{
              borderColor: `${statusDotColors[entry.status] ?? '#62666d'}40`,
              backgroundColor: `${statusDotColors[entry.status] ?? '#62666d'}15`,
              color: statusDotColors[entry.status] ?? '#62666d',
            }}
            title={`${entry.title} (${entry.status})`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: statusDotColors[entry.status] ?? '#62666d' }}
            />
            {entry.taskKey}
          </span>
        </div>
      ))}
    </div>
  )
}
