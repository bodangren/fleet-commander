import { describe, it, expect } from 'bun:test';
import {
  DEFAULT_EXECUTOR_BACKEND,
  resolveExecutorBackend,
  selectExecutor,
  type BackendExecuteFn,
} from './executorBackend';
import { executeTask } from './executor';
import { executeTaskViaPi } from './piExecutor';

describe('resolveExecutorBackend', () => {
  it('defaults to opencode when unset, so existing deployments do not change', () => {
    expect(DEFAULT_EXECUTOR_BACKEND).toBe('opencode');
    expect(resolveExecutorBackend({})).toBe('opencode');
  });

  it('selects the pi backend when explicitly configured', () => {
    expect(resolveExecutorBackend({ FLEET_EXECUTOR_BACKEND: 'pi' })).toBe('pi');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(resolveExecutorBackend({ FLEET_EXECUTOR_BACKEND: '  PI ' })).toBe('pi');
    expect(resolveExecutorBackend({ FLEET_EXECUTOR_BACKEND: 'OpenCode' })).toBe(
      'opencode',
    );
  });

  it('falls back to the default on an unrecognised value rather than throwing', () => {
    expect(resolveExecutorBackend({ FLEET_EXECUTOR_BACKEND: 'claude' })).toBe(
      'opencode',
    );
  });

  it('treats a blank value as unset', () => {
    expect(resolveExecutorBackend({ FLEET_EXECUTOR_BACKEND: '   ' })).toBe('opencode');
  });
});

describe('selectExecutor', () => {
  it('returns the OpenCode executor for the opencode backend', () => {
    expect(selectExecutor('opencode')).toBe(executeTask);
  });

  it('returns the Pi executor for the pi backend', () => {
    expect(selectExecutor('pi')).toBe(executeTaskViaPi);
  });

  it('reads the environment when no backend is given', () => {
    expect(selectExecutor()).toBe(executeTask);
  });
});

describe('backend contract parity', () => {
  it('both backends declare the seven shared positional parameters', () => {
    // executeWithRetry passes seven positional arguments and holds either
    // backend without a shim. Each backend takes a private eighth injection
    // slot (SDK client / test deps) that the orchestrator never supplies, so
    // parity is asserted on the shared prefix, not on total arity.
    const shared: BackendExecuteFn[] = [executeTask, executeTaskViaPi];
    for (const fn of shared) {
      expect(fn.length).toBeGreaterThanOrEqual(7);
    }
  });
});
