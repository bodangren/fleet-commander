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

  calculateBackoff(attempt: number): number {
    const exponential = this.config.baseDelayMs * Math.pow(2, attempt);
    const capped = Math.min(exponential, this.config.maxDelayMs);
    const jitter = Math.random() * this.config.jitterMs;
    return Math.round(capped + jitter);
  }
}
