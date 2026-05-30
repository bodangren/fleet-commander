export const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
export const CLEANUP_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Returns true if notification should be deduplicated within the dedupe window (5 min).
 * @param existingCreatedAt - Creation timestamp of existing notification
 * @param now - Current timestamp
 * @returns True if notification is within dedupe window
 */
export function shouldDedupeNotification(
  existingCreatedAt: number,
  now: number,
): boolean {
  return now - existingCreatedAt < DEDUPE_WINDOW_MS;
}

/**
 * Returns true if notification should be cleaned up after retention period (30 days).
 * @param createdAt - Creation timestamp of notification
 * @param now - Current timestamp
 * @returns True if notification has exceeded retention period
 */
export function shouldCleanupNotification(
  createdAt: number,
  now: number,
): boolean {
  return now - createdAt > CLEANUP_AGE_MS;
}
