import { ConvexProvider as BaseConvexProvider } from 'convex/react'
import type { ReactNode } from 'react'
import { convexClient } from './convex'

/**
 * React component that wraps children with Convex provider when URL is configured
 * @param children - React children nodes
 * @returns Convex provider wrapper or children as-is if no URL
 */
export function ConvexProvider({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return <>{children}</>
  }

  return <BaseConvexProvider client={convexClient}>{children}</BaseConvexProvider>
}
