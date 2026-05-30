import { ConvexProvider as BaseConvexProvider, ConvexReactClient } from 'convex/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

/**
 * React component that wraps children with Convex provider when URL is configured
 * @param children - React children nodes
 * @returns Convex provider wrapper or children as-is if no URL
 */
export function ConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    if (!convexUrl) return null
    return new ConvexReactClient(convexUrl)
  }, [])

  if (!client) {
    return <>{children}</>
  }

  return <BaseConvexProvider client={client}>{children}</BaseConvexProvider>
}

/**
 * Returns true if CONVEX_DEPLOYMENT environment variable is set
 * @returns Boolean indicating if Convex URL is configured
 */
export function hasConvexUrl(): boolean {
  return Boolean(convexUrl)
}
