import { describe, expect, it, beforeEach } from 'bun:test';
import { CircuitBreaker } from './circuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-agent', {
      failureThreshold: 3,
      windowMs: 300_000,
      halfOpenTimeoutMs: 60_000,
    });
  });

  it('initializes in closed state', () => {
    const state = breaker.getState();
    expect(state.state).toBe('closed');
    expect(state.failureCount).toBe(0);
    expect(state.agentId).toBe('test-agent');
  });

  it('records failures and opens circuit at threshold', () => {
    breaker.recordFailure();
    expect(breaker.getState().failureCount).toBe(1);
    expect(breaker.getState().state).toBe('closed');

    breaker.recordFailure();
    expect(breaker.getState().failureCount).toBe(2);
    expect(breaker.getState().state).toBe('closed');

    breaker.recordFailure();
    expect(breaker.getState().failureCount).toBe(3);
    expect(breaker.getState().state).toBe('open');
  });

  it('allows requests when closed', () => {
    expect(breaker.allowRequest()).toBe(true);
  });

  it('blocks requests when open', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.allowRequest()).toBe(false);
  });

  it('allows single request when half-open', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    breaker.forceHalfOpen();
    expect(breaker.allowRequest()).toBe(true);
  });

  it('closes circuit on success from half-open', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.forceHalfOpen();

    breaker.recordSuccess();
    expect(breaker.getState().state).toBe('closed');
    expect(breaker.getState().failureCount).toBe(0);
  });

  it('reopens circuit on failure from half-open', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.forceHalfOpen();

    breaker.recordFailure();
    expect(breaker.getState().state).toBe('open');
  });

  it('resets failures on success when closed', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    expect(breaker.getState().failureCount).toBe(0);
  });

  it('resets circuit to initial state', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    breaker.reset();
    const state = breaker.getState();
    expect(state.state).toBe('closed');
    expect(state.failureCount).toBe(0);
    expect(state.openedAt).toBeUndefined();
  });

  it('serializes to JSON', () => {
    breaker.recordFailure();
    const json = breaker.serialize();
    const parsed = JSON.parse(json);
    expect(parsed.agentId).toBe('test-agent');
    expect(parsed.state).toBe('closed');
    expect(parsed.failureCount).toBe(1);
  });

  it('deserializes from JSON', () => {
    const json = JSON.stringify({
      agentId: 'test-agent',
      state: 'open' as const,
      failureCount: 3,
      failureWindowStart: Date.now(),
      openedAt: Date.now(),
      failureThreshold: 3,
      windowMs: 300_000,
      halfOpenTimeoutMs: 60_000,
    });

    const restored = CircuitBreaker.fromJSON(json);
    expect(restored.getState().state).toBe('open');
    expect(restored.getState().failureCount).toBe(3);
  });

  it('tracks window expiration and resets failures', () => {
    const windowMs = 300_000;
    const halfOpenTimeoutMs = 60_000;
    const baseTime = Date.now() - 500_000;

    const breaker = new CircuitBreaker('test-agent', {
      failureThreshold: 3,
      windowMs,
      halfOpenTimeoutMs,
    });

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    expect(breaker.getState().state).toBe('open');

    const json = JSON.stringify({
      agentId: 'test-agent',
      state: 'open' as const,
      failureCount: 3,
      failureWindowStart: baseTime,
      openedAt: baseTime + 1000,
      failureThreshold: 3,
      windowMs,
      halfOpenTimeoutMs,
    });

    const restored = CircuitBreaker.fromJSON(json);

    const now = Date.now();
    restored.recordFailureAt(0, now);

    const state = restored.getState();
    expect(state.failureCount).toBe(1);
    expect(state.state).toBe('closed');
  });
});
