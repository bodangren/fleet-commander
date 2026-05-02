import type { ConvexHttpClient } from 'convex/browser';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('fetch failed') ||
    msg.includes('503') ||
    msg.includes('502')
  );
}

function calculateBackoff(attempt: number, opts: Required<RetryOptions>): number {
  const exponential = opts.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, opts.maxDelayMs);
  const jitter = Math.random() * opts.baseDelayMs;
  return Math.round(capped + jitter);
}

/**
 * Wraps a Convex mutation call with exponential backoff retry.
 * Only retries on network/availability errors, not validation errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === opts.maxRetries) {
        throw err;
      }
      const delay = calculateBackoff(attempt, opts);
      console.warn(
        `[retry] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed, retrying in ${delay}ms: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}
