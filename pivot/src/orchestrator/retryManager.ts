import type { RetryConfig } from './types';

export class RetryManager {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = config;
  }

  getMaxRetries(): number {
    return this.config.maxRetries;
  }

  getBaseDelayMs(): number {
    return this.config.baseDelayMs;
  }

  getMaxDelayMs(): number {
    return this.config.maxDelayMs;
  }

  getJitterMs(): number {
    return this.config.jitterMs;
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.config.maxRetries;
  }

  getRemainingRetries(attempt: number): number {
    const remaining = this.config.maxRetries - attempt;
    return Math.max(0, remaining);
  }

  /**
   * Legacy exponential backoff: baseDelayMs * 2^attempt + jitter
   */
  calculateBackoff(attempt: number): number {
    const exponential = this.config.baseDelayMs * Math.pow(2, attempt);
    const capped = Math.min(exponential, this.config.maxDelayMs);
    const jitter = Math.random() * this.config.jitterMs;
    return Math.round(capped + jitter);
  }

  /**
   * Symphony exponential backoff: min(baseDelayMs * 2^(attempt-1), maxDelayMs)
   * No jitter — deterministic delay per the Symphony spec.
   * attempt is 1-indexed (first retry = attempt 1).
   */
  calculateSymphonyBackoff(attempt: number): number {
    const exponent = Math.max(0, attempt - 1);
    const delay = this.config.baseDelayMs * Math.pow(2, exponent);
    return Math.min(delay, this.config.maxDelayMs);
  }
}
