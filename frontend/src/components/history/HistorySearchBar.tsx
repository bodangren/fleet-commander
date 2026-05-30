import { useCallback, type ChangeEvent } from 'react'

import { sanitizeSearchQuery } from '@/lib/historyFilters'

export interface HistorySearchBarProps {
  value: string
  onChange: (value: string) => void
  'aria-label'?: string
}

/**
 * Search input with sanitized query and aria-label support
 */
export function HistorySearchBar({
  value,
  onChange,
  'aria-label': ariaLabel,
}: HistorySearchBarProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeSearchQuery(e.target.value)
      onChange(sanitized)
    },
    [onChange],
  )

  return (
    <input
      type="text"
      placeholder="Search tasks..."
      value={value}
      onChange={handleChange}
      aria-label={ariaLabel ?? 'Search tasks'}
      className="flex-1 min-w-[200px] px-4 py-2 border-2 border-border rounded-md bg-card"
    />
  )
}
