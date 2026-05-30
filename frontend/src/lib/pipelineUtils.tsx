import { CheckCircle2, XCircle, Loader2, Clock, AlertTriangle } from 'lucide-react'

export const statusIcons: Record<string, React.ReactNode> = {
  succeeded: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-blue-400" />,
  pending: <Clock className="h-4 w-4 text-yellow-400" />,
  cancelled: <AlertTriangle className="h-4 w-4 text-gray-400" />,
}

export const statusColors: Record<string, string> = {
  succeeded: 'text-green-400',
  failed: 'text-red-400',
  running: 'text-blue-400',
  pending: 'text-yellow-400',
  cancelled: 'text-gray-400',
}

/**
 * Format time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date/time string using locale formatting
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}
