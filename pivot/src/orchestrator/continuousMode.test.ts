import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { ContinuousModeManager } from './continuousMode';
import type { ContinuousModeState } from './types';

describe('ContinuousModeState type', () => {
  it('supports valid state values', () => {
    const states: Array<ContinuousModeState['state']> = ['running', 'paused', 'idle'];
    expect(states).toEqual(['running', 'paused', 'idle']);
  });
});

describe('ContinuousModeManager', () => {
  let manager: ContinuousModeManager;

  beforeEach(() => {
    manager = new ContinuousModeManager();
  });

  it('initializes with defaults', () => {
    const state = manager.getState();
    expect(state.enabled).toBe(false);
    expect(state.state).toBe('idle');
    expect(state.intervalMs).toBe(60_000);
    expect(state.consecutiveFailures).toBe(0);
    expect(state.maxConcurrent).toBe(1);
  });

  it('enables continuous mode', () => {
    manager.setEnabled(true);
    expect(manager.getState().enabled).toBe(true);
  });

  it('disables continuous mode', () => {
    manager.setEnabled(true);
    manager.setEnabled(false);
    expect(manager.getState().enabled).toBe(false);
  });

  it('sets state to running', () => {
    manager.setState('running');
    expect(manager.getState().state).toBe('running');
  });

  it('sets state to paused', () => {
    manager.setState('paused');
    expect(manager.getState().state).toBe('paused');
  });

  it('sets state to idle', () => {
    manager.setState('idle');
    expect(manager.getState().state).toBe('idle');
  });

  it('sets interval within valid range', () => {
    manager.setIntervalMs(120_000);
    expect(manager.getState().intervalMs).toBe(120_000);
  });

  it('clamps interval to minimum (10000ms)', () => {
    manager.setIntervalMs(5_000);
    expect(manager.getState().intervalMs).toBe(10_000);
  });

  it('clamps interval to maximum (3600000ms)', () => {
    manager.setIntervalMs(7_200_000);
    expect(manager.getState().intervalMs).toBe(3_600_000);
  });

  it('sets max concurrent executions', () => {
    manager.setMaxConcurrent(3);
    expect(manager.getState().maxConcurrent).toBe(3);
  });

  it('increments consecutive failures', () => {
    manager.recordFailure();
    expect(manager.getState().consecutiveFailures).toBe(1);
    manager.recordFailure();
    expect(manager.getState().consecutiveFailures).toBe(2);
  });

  it('resets consecutive failures on success', () => {
    manager.recordFailure();
    manager.recordFailure();
    manager.recordSuccess();
    expect(manager.getState().consecutiveFailures).toBe(0);
  });

  it('should auto-pause returns true after maxConsecutiveFailures', () => {
    manager.setMaxConsecutiveFailures(3);
    manager.recordFailure();
    manager.recordFailure();
    expect(manager.shouldAutoPause()).toBe(false);
    manager.recordFailure();
    expect(manager.shouldAutoPause()).toBe(true);
  });

  it('should auto-pause returns false if not enough failures', () => {
    manager.setMaxConsecutiveFailures(3);
    manager.recordFailure();
    expect(manager.shouldAutoPause()).toBe(false);
  });

  it('should auto-pause resets after success', () => {
    manager.setMaxConsecutiveFailures(3);
    manager.recordFailure();
    manager.recordFailure();
    manager.recordFailure();
    expect(manager.shouldAutoPause()).toBe(true);
    manager.recordSuccess();
    expect(manager.shouldAutoPause()).toBe(false);
  });

  it('auto-pause sets state to paused', () => {
    manager.setState('running');
    manager.autoPause();
    expect(manager.getState().state).toBe('paused');
  });

  it('resume sets state to running', () => {
    manager.setState('paused');
    manager.resume();
    expect(manager.getState().state).toBe('running');
  });

  it('pause sets state to paused', () => {
    manager.setState('running');
    manager.pause();
    expect(manager.getState().state).toBe('paused');
  });

  it('isIdle returns true when state is idle', () => {
    manager.setState('idle');
    expect(manager.isIdle()).toBe(true);
  });

  it('isIdle returns false when state is running', () => {
    manager.setState('running');
    expect(manager.isIdle()).toBe(false);
  });

  it('isPaused returns true when state is paused', () => {
    manager.setState('paused');
    expect(manager.isPaused()).toBe(true);
  });

  it('isPaused returns false when state is running', () => {
    manager.setState('running');
    expect(manager.isPaused()).toBe(false);
  });

  it('isRunning returns true when enabled and state is running', () => {
    manager.setEnabled(true);
    manager.setState('running');
    expect(manager.isRunning()).toBe(true);
  });

  it('isRunning returns false when disabled', () => {
    manager.setEnabled(false);
    manager.setState('running');
    expect(manager.isRunning()).toBe(false);
  });

  it('isRunning returns false when paused', () => {
    manager.setEnabled(true);
    manager.setState('paused');
    expect(manager.isRunning()).toBe(false);
  });

  it('serialize produces valid JSON', () => {
    manager.setEnabled(true);
    manager.setState('running');
    manager.setIntervalMs(120_000);
    const serialized = manager.serialize();
    const parsed = JSON.parse(serialized);
    expect(parsed.enabled).toBe(true);
    expect(parsed.state).toBe('running');
    expect(parsed.intervalMs).toBe(120_000);
  });

  it('deserialize restores state', () => {
    const json = JSON.stringify({
      enabled: true,
      state: 'running' as const,
      intervalMs: 90_000,
      consecutiveFailures: 2,
      maxConcurrent: 2,
      maxConsecutiveFailures: 5,
    });
    manager.deserialize(json);
    const state = manager.getState();
    expect(state.enabled).toBe(true);
    expect(state.state).toBe('running');
    expect(state.intervalMs).toBe(90_000);
    expect(state.consecutiveFailures).toBe(2);
    expect(state.maxConcurrent).toBe(2);
  });
});
