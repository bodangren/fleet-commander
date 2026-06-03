import { useEffect, useState } from 'react'

/**
 * Returns true if loading has exceeded the timeout duration.
 * @param isLoading - Whether the data is currently loading (undefined)
 * @param timeoutMs - Timeout in milliseconds (default 10000)
 */
export function useLoadingTimeout(isLoading: boolean, timeoutMs = 10000): boolean {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false)
      return
    }

    const timer = setTimeout(() => setTimedOut(true), timeoutMs)
    return () => clearTimeout(timer)
  }, [isLoading, timeoutMs])

  return timedOut
}
