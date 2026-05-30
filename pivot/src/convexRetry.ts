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

/**
 * Promise-based delay using setTimeout
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error message indicates a retryable failure
 * @param err - The error object to check
 * @returns True if the error is retryable
 */
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

/**
 * Compute exponential backoff delay with jitter cap
 * @param attempt - The current attempt number (0-indexed)
 * @param opts - Retry options with baseDelayMs and maxDelayMs
 * @returns The delay in milliseconds
 */
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
