import { cn } from '@/lib/utils'
import { renderMarkdownBlocks } from '@/lib/markdown'

/**
 * Renders a markdown view component
 * @param value - The markdown string to render
 * @param className - Optional CSS class name
 */
export function MarkdownViewer({ value, className }: { value: string; className?: string }) {
  return <div className={cn('space-y-4', className)}>{renderMarkdownBlocks(value)}</div>
}
