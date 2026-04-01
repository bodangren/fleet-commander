import { ConvexReactClient } from 'convex/react'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

export const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null

export function isConvexAvailable(): boolean {
  return convexClient !== null
}
