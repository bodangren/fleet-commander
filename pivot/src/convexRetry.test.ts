import { describe, expect, test, mock } from 'bun:test';
import { withRetry } from './convexRetry';

describe('withRetry', () => {
  test('returns result on first success', async () => {
    const fn = mock(async () => 'ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries on network error and succeeds', async () => {
    let calls = 0;
    const fn = mock(async () => {
      calls++;
      if (calls < 3) throw new Error('network timeout');
      return 'recovered';
    });

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 50 });
    expect(result).toBe('recovered');
    expect(calls).toBe(3);
  });

  test('does not retry on validation error', async () => {
    const fn = mock(async () => {
      throw new Error('Validation failed: invalid input');
    });

    await expect(withRetry(fn, { maxRetries: 3, baseDelayMs: 10 })).rejects.toThrow(
      'Validation failed',
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('throws after max retries exhausted', async () => {
    const fn = mock(async () => {
      throw new Error('econnrefused');
    });

    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 5, maxDelayMs: 10 })).rejects.toThrow(
      'econnrefused',
    );
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  test('retries on 503 error', async () => {
    let calls = 0;
    const fn = mock(async () => {
      calls++;
      if (calls === 1) throw new Error('HTTP 503 Service Unavailable');
      return 'ok';
    });

    const result = await withRetry(fn, { maxRetries: 1, baseDelayMs: 5 });
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });
});
