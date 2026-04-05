import { describe, expect, it, beforeEach } from 'bun:test';
import { ConcurrencyLimiter } from './concurrencyLimiter';

describe('ConcurrencyLimiter', () => {
  let limiter: ConcurrencyLimiter;

  beforeEach(() => {
    limiter = new ConcurrencyLimiter(2);
  });

  it('allows execution when under limit', () => {
    expect(limiter.canExecute()).toBe(true);
  });

  it('blocks execution when at limit', () => {
    limiter.acquire();
    limiter.acquire();
    expect(limiter.canExecute()).toBe(false);
  });

  it('releases a slot', () => {
    limiter.acquire();
    limiter.acquire();
    expect(limiter.canExecute()).toBe(false);
    limiter.release();
    expect(limiter.canExecute()).toBe(true);
  });

  it('tracks active count correctly', () => {
    expect(limiter.activeCount).toBe(0);
    limiter.acquire();
    expect(limiter.activeCount).toBe(1);
    limiter.acquire();
    expect(limiter.activeCount).toBe(2);
    limiter.release();
    expect(limiter.activeCount).toBe(1);
    limiter.release();
    expect(limiter.activeCount).toBe(0);
  });

  it('throws if releasing when nothing is active', () => {
    expect(() => limiter.release()).toThrow();
  });

  it('resets all active slots', () => {
    limiter.acquire();
    limiter.acquire();
    limiter.reset();
    expect(limiter.activeCount).toBe(0);
    expect(limiter.canExecute()).toBe(true);
  });

  it('supports changing the limit', () => {
    limiter.acquire();
    limiter.acquire();
    expect(limiter.canExecute()).toBe(false);
    limiter.setLimit(3);
    expect(limiter.canExecute()).toBe(true);
  });
});
