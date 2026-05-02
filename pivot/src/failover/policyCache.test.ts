import { describe, expect, test } from 'bun:test';
import { StalenessCache } from './policyCache';

describe('StalenessCache', () => {
  test('returns null when empty', () => {
    const cache = new StalenessCache<string>();
    expect(cache.get()).toBeNull();
    expect(cache.isFresh()).toBe(false);
  });

  test('returns fresh data after set', () => {
    const cache = new StalenessCache<string>(10_000);
    cache.set('hello');
    const result = cache.get();
    expect(result).not.toBeNull();
    expect(result!.data).toBe('hello');
    expect(result!.stale).toBe(false);
    expect(cache.isFresh()).toBe(true);
  });

  test('marks data as stale after TTL expires', async () => {
    const cache = new StalenessCache<string>(50); // 50ms TTL
    cache.set('hello');
    expect(cache.isFresh()).toBe(true);

    await new Promise((r) => setTimeout(r, 60));
    expect(cache.isFresh()).toBe(false);

    const result = cache.get();
    expect(result).not.toBeNull();
    expect(result!.data).toBe('hello');
    expect(result!.stale).toBe(true);
  });

  test('clear removes cached data', () => {
    const cache = new StalenessCache<number>();
    cache.set(42);
    expect(cache.get()).not.toBeNull();
    cache.clear();
    expect(cache.get()).toBeNull();
  });

  test('overwrites previous data on set', () => {
    const cache = new StalenessCache<string>();
    cache.set('first');
    cache.set('second');
    expect(cache.get()!.data).toBe('second');
  });

  test('getStalenessMs returns configured value', () => {
    const cache = new StalenessCache<void>(900_000);
    expect(cache.getStalenessMs()).toBe(900_000);
  });
});
