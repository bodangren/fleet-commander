import { useCallback, useEffect, useRef, useState } from 'react'

import type { KanbanTask } from '@/hooks/useKanbanBoard'
import { taskStatusDisplay } from '../../../../convex/lib/validators'

type Dependency = {
  taskKey: string
  title: string
  status: string
  storyPoints: number
}

type DependencyEditorProps = {
  taskKey: string
  dependencies: Dependency[]
  allTasks: KanbanTask[]
  onAdd: (dependencyKey: string) => Promise<{ ok: boolean; error?: string }>
  onRemove: (dependencyKey: string) => Promise<{ ok: boolean; error?: string }>
}

const statusColors: Record<string, string> = taskStatusDisplay

/**
 * Editor for task dependencies with search autocomplete, add/remove, and cycle warning
 */
export function DependencyEditor({
  taskKey,
  dependencies,
  allTasks,
  onAdd,
  onRemove,
}: DependencyEditorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [removingKey, setRemovingKey] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const depKeys = new Set(dependencies.map(d => d.taskKey))

  const filteredTasks = allTasks.filter(
    t =>
      t.taskKey !== taskKey &&
      !depKeys.has(t.taskKey) &&
      (t.taskKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleAdd = useCallback(
    async (depKey: string) => {
      setError(null)
      setAdding(true)
      try {
        const result = await onAdd(depKey)
        if (!result.ok) {
          setError(result.error ?? 'Failed to add dependency')
        } else {
          setSearchQuery('')
          setShowDropdown(false)
        }
      } finally {
        setAdding(false)
      }
    },
    [onAdd],
  )

  const handleRemove = useCallback(
    async (depKey: string) => {
      setError(null)
      setRemovingKey(depKey)
      try {
        const result = await onRemove(depKey)
        if (!result.ok) {
          setError(result.error ?? 'Failed to remove dependency')
        }
      } finally {
        setRemovingKey(null)
      }
    },
    [onRemove],
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[#8a8f98]">Dependencies</h4>
        <span className="text-[10px] font-mono text-[#62666d]">
          {dependencies.length} blocker{dependencies.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="text-[11px] text-[#ef4444] bg-[rgba(239,68,68,0.1)] rounded px-2 py-1.5"
        >
          {error}
        </div>
      )}

      {dependencies.length > 0 && (
        <div className="space-y-1.5">
          {dependencies.map(dep => {
            const colorClass = statusColors[dep.status] ?? statusColors.backlog
            return (
              <div
                key={dep.taskKey}
                className="flex items-center justify-between gap-2 bg-[#0a0a0b] border border-[#23252a] rounded-md px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colorClass}`}>
                    {dep.status === 'done' ? 'DONE' : dep.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-[#f7f8f8] truncate">{dep.title}</span>
                  <span className="text-[10px] font-mono text-[#62666d] shrink-0">
                    {dep.taskKey}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemove(dep.taskKey)}
                  disabled={removingKey === dep.taskKey}
                  className="text-[10px] text-[#8a8f98] hover:text-[#ef4444] transition-colors shrink-0 disabled:opacity-50"
                  aria-label={`Remove dependency ${dep.taskKey}`}
                >
                  {removingKey === dep.taskKey ? '...' : 'x'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="relative" ref={dropdownRef}>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value)
            setShowDropdown(true)
            setError(null)
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Add dependency by task key..."
          disabled={adding}
          className="w-full bg-[#0a0a0b] border border-[#23252a] rounded-md px-3 py-1.5 text-xs text-[#f7f8f8] placeholder:text-[#62666d] focus:outline-none focus:border-[#5e6ad2] disabled:opacity-50"
        />
        {showDropdown && searchQuery.length > 0 && filteredTasks.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0f1011] border border-[#23252a] rounded-md shadow-lg max-h-40 overflow-y-auto">
            {filteredTasks.slice(0, 10).map(t => (
              <button
                key={t.taskKey}
                type="button"
                onClick={() => void handleAdd(t.taskKey)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[#1a1b1d] transition-colors flex items-center justify-between"
              >
                <span className="text-[#f7f8f8] truncate">{t.title}</span>
                <span className="text-[10px] font-mono text-[#62666d] shrink-0 ml-2">
                  {t.taskKey}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
