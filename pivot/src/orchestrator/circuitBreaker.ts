import type { CircuitBreakerState, CircuitBreakerStateType } from './types';

export class CircuitBreaker {
  private state: CircuitBreakerState;

  constructor(
    agentId: string,
    config: {
      failureThreshold: number;
      windowMs: number;
      halfOpenTimeoutMs: number;
    },
  ) {
    this.state = {
      agentId,
      state: 'closed',
      failureCount: 0,
      failureWindowStart: Date.now(),
      failureThreshold: config.failureThreshold,
      windowMs: config.windowMs,
      halfOpenTimeoutMs: config.halfOpenTimeoutMs,
    };
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  allowRequest(): boolean {
    if (this.state.state === 'closed') return true;
    if (this.state.state === 'open') {
      if (this.isHalfOpenTimeoutElapsed()) {
        this.state.state = 'half-open';
        return true;
      }
      return false;
    }
    return true;
  }

  recordFailure(): void {
    const now = Date.now();
    this.recordFailureAt(this.state.failureCount + 1, now);
  }

  recordFailureAt(count: number, timestamp: number): void {
    if (timestamp - this.state.failureWindowStart > this.state.windowMs) {
      this.state.failureCount = 1;
      this.state.failureWindowStart = timestamp;
      this.state.state = 'closed';
      this.state.openedAt = undefined;
    } else {
      this.state.failureCount++;
    }

    if (
      this.state.state !== 'open' &&
      this.state.failureCount >= this.state.failureThreshold
    ) {
      this.state.state = 'open';
      this.state.openedAt = timestamp;
    }
  }

  recordSuccess(): void {
    if (this.state.state === 'half-open') {
      this.state.state = 'closed';
      this.state.failureCount = 0;
      this.state.failureWindowStart = Date.now();
      this.state.openedAt = undefined;
    } else if (this.state.state === 'closed') {
      this.state.failureCount = 0;
    }
  }

  forceHalfOpen(): void {
    this.state.state = 'half-open';
  }

  reset(): void {
    this.state.state = 'closed';
    this.state.failureCount = 0;
    this.state.failureWindowStart = Date.now();
    this.state.openedAt = undefined;
  }

  isHalfOpenTimeoutElapsed(): boolean {
    if (!this.state.openedAt) return false;
    return Date.now() - this.state.openedAt > this.state.halfOpenTimeoutMs;
  }

  serialize(): string {
    return JSON.stringify(this.state);
  }

  static fromJSON(json: string): CircuitBreaker {
    const data = JSON.parse(json) as CircuitBreakerState;
    const breaker = new CircuitBreaker(data.agentId, {
      failureThreshold: data.failureThreshold,
      windowMs: data.windowMs,
      halfOpenTimeoutMs: data.halfOpenTimeoutMs,
    });
    breaker.state = { ...data };
    return breaker;
  }
}
