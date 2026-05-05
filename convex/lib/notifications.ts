export const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
export const CLEANUP_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function shouldDedupeNotification(
  existingCreatedAt: number,
  now: number,
): boolean {
  return now - existingCreatedAt < DEDUPE_WINDOW_MS;
}

export function shouldCleanupNotification(
  createdAt: number,
  now: number,
): boolean {
  return now - createdAt > CLEANUP_AGE_MS;
}
