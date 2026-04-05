import { describe, expect, it, beforeEach } from 'bun:test';
import { RetryManager } from './retryManager';
import { DEFAULT_RETRY_CONFIG } from './types';

describe('RetryManager', () => {
  let manager: RetryManager;

  beforeEach(() => {
    manager = new RetryManager(DEFAULT_RETRY_CONFIG);
  });

  it('initializes with default config', () => {
    expect(manager.getMaxRetries()).toBe(2);
    expect(manager.getBaseDelayMs()).toBe(1000);
    expect(manager.getMaxDelayMs()).toBe(4000);
    expect(manager.getJitterMs()).toBe(500);
  });

  it('allows custom config', () => {
    const custom = new RetryManager({
      maxRetries: 5,
      baseDelayMs: 2000,
      maxDelayMs: 8000,
      jitterMs: 1000,
    });
    expect(custom.getMaxRetries()).toBe(5);
    expect(custom.getBaseDelayMs()).toBe(2000);
  });

  it('shouldRetry returns true when under max retries', () => {
    expect(manager.shouldRetry(0)).toBe(true);
    expect(manager.shouldRetry(1)).toBe(true);
  });

  it('shouldRetry returns false at max retries', () => {
    expect(manager.shouldRetry(2)).toBe(false);
    expect(manager.shouldRetry(3)).toBe(false);
  });

  it('calculates exponential backoff without jitter', () => {
    const noJitter = new RetryManager({
      maxRetries: 5,
      baseDelayMs: 1000,
      maxDelayMs: 4000,
      jitterMs: 0,
    });
    expect(noJitter.calculateBackoff(0)).toBe(1000);
    expect(noJitter.calculateBackoff(1)).toBe(2000);
    expect(noJitter.calculateBackoff(2)).toBe(4000);
  });

  it('caps backoff at max delay', () => {
    const large = new RetryManager({
      maxRetries: 10,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      jitterMs: 0,
    });
    expect(large.calculateBackoff(3)).toBe(5000);
    expect(large.calculateBackoff(5)).toBe(5000);
  });

  it('adds jitter within bounds', () => {
    const managerWithJitter = new RetryManager({
      maxRetries: 5,
      baseDelayMs: 1000,
      maxDelayMs: 4000,
      jitterMs: 500,
    });

    for (let i = 0; i < 10; i++) {
      const delay = managerWithJitter.calculateBackoff(0);
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1500);
    }
  });

  it('getRemainingRetries returns correct count', () => {
    expect(manager.getRemainingRetries(0)).toBe(2);
    expect(manager.getRemainingRetries(1)).toBe(1);
    expect(manager.getRemainingRetries(2)).toBe(0);
  });
});
