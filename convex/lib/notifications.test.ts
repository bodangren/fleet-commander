import { describe, expect, it } from 'bun:test';
import {
  shouldDedupeNotification,
  shouldCleanupNotification,
  DEDUPE_WINDOW_MS,
  CLEANUP_AGE_MS,
} from './notifications';

describe('shouldDedupeNotification', () => {
  it('returns true when duplicate is within 5-minute window', () => {
    const now = Date.now();
    expect(shouldDedupeNotification(now - 60000, now)).toBe(true);
  });

  it('returns false when duplicate is older than 5-minute window', () => {
    const now = Date.now();
    expect(shouldDedupeNotification(now - DEDUPE_WINDOW_MS - 1, now)).toBe(false);
  });

  it('returns true at exact boundary', () => {
    const now = Date.now();
    expect(shouldDedupeNotification(now - DEDUPE_WINDOW_MS + 1, now)).toBe(true);
  });
});

describe('shouldCleanupNotification', () => {
  it('returns true when notification is older than 30 days', () => {
    const now = Date.now();
    expect(shouldCleanupNotification(now - CLEANUP_AGE_MS - 1, now)).toBe(true);
  });

  it('returns false when notification is within 30 days', () => {
    const now = Date.now();
    expect(shouldCleanupNotification(now - CLEANUP_AGE_MS + 1, now)).toBe(false);
  });

  it('returns false for fresh notification', () => {
    const now = Date.now();
    expect(shouldCleanupNotification(now, now)).toBe(false);
  });
});
