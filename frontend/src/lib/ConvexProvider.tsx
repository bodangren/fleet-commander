import {
  ConvexProvider as BaseConvexProvider,
  ConvexReactClient,
} from 'convex/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

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

export function hasConvexUrl(): boolean {
  return Boolean(convexUrl)
}
