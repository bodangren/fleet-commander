import { ConvexReactClient } from 'convex/react'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

export const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null

/**
 * Returns true if Convex deployment URL is configured and available
 * @returns Boolean indicating if Convex is available
 */
export function isConvexAvailable(): boolean {
  return convexClient !== null
}
