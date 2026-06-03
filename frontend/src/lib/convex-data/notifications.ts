import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery } from './core'

export interface NotificationEntry {
  _id: string
  userId: string
  type: string
  title: string
  body: string
  channel: 'in_app' | 'webhook' | 'email'
  read: boolean
  createdAt: number
  metadata?: string
}

/**
 * Returns notifications for a user.
 * Returns an empty array when Convex is not configured.
 */
export function useNotifications(
  userId: string | undefined,
  limit: number = 50,
): NotificationEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(userId)
  const raw = useConvexQuery<
    Array<{
      _id: string
      userId: string
      type: string
      title: string
      body: string
      channel: 'in_app' | 'webhook' | 'email'
      read: boolean
      createdAt: number
      metadata?: string
    }>
  >('notifications:getUserNotifications', { userId: userId ?? '', limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

/**
 * Returns unread notification count for a user.
 * Returns 0 when Convex is not configured.
 */
export function useUnreadCount(userId: string | undefined): number | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(userId)
  const raw = useConvexQuery<number>(
    'notifications:getUnreadCount',
    { userId: userId ?? '' },
    enabled,
  )
  if (raw === undefined && !enabled) return 0
  return raw
}

export interface NotificationPreferenceEntry {
  _id: string
  userId: string
  muteAll: boolean
  inAppEnabled: boolean
  webhookUrl?: string
  webhookEnabled: boolean
  email?: string
  emailEnabled: boolean
  typeFilters?: string
  updatedAt: number
}

/**
 * Returns notification preferences for a user.
 * Returns null when Convex is not configured, undefined when still loading.
 */
export function useNotificationPreferences(
  userId: string | undefined,
): NotificationPreferenceEntry | undefined | null {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(userId)
  const raw = useConvexQuery<NotificationPreferenceEntry | null>(
    'notifications:getNotificationPreferences',
    { userId: userId ?? '' },
    enabled,
  )
  if (raw === undefined && !enabled) return null
  if (raw === undefined) return undefined
  return raw
}
