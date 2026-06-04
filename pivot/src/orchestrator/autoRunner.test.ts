import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import { AutoRunner, readIntervalMs } from './autoRunner';
import { withExecutionGuard } from './executionGuard';
import type { OrchestratorConfig } from './types';

describe('AutoRunner', () => {
  let runner: AutoRunner;

  beforeEach(() => {
    // Clear any pending timers
  });

  afterEach(() => {
    if (runner) {
      runner.stop();
    }
  });

  it('starts and stops without error', () => {
    runner = new AutoRunner(() => 1000);
    runner.start();
    expect(runner).toBeDefined();
    runner.stop();
  });

  it('does not start twice', () => {
    runner = new AutoRunner(() => 1000);
    runner.start();
    runner.start(); // should be no-op
    runner.stop();
  });

  it('uses default interval when getter returns 0', async () => {
    const config: OrchestratorConfig = {
      maxRetries: 0,
      baseDelayMs: 1,
      maxDelayMs: 1,
      commandTimeoutMs: 1000,
    };
    runner = new AutoRunner(() => 0, config);
    runner.start();
    // Wait a bit for the tick to fire
    await new Promise((resolve) => setTimeout(resolve, 100));
    runner.stop();
  });

  it('stops gracefully', () => {
    runner = new AutoRunner(() => 1000);
    runner.start();
    runner.stop();
    runner.stop(); // idempotent
  });
});

describe('withExecutionGuard', () => {
  it('prevents overlapping calls', async () => {
    let callCount = 0;
    let resolveFirst: (() => void) | null = null;

    const slowFn = () => {
      callCount++;
      if (callCount === 1) {
        return new Promise<void>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve();
    };

    const guarded = withExecutionGuard(slowFn);

    // Start first call — hangs until we resolve
    const firstCall = guarded();

    // Second call while first is running — should be skipped
    const secondCall = guarded();
    expect(await secondCall).toBeNull();

    // Let first call finish
    resolveFirst!();
    await firstCall;

    expect(callCount).toBe(1);
  });

  it('invokes onSkipped callback when a call is skipped', async () => {
    let skipped = false;
    const slowFn = () => new Promise<void>((resolve) => setTimeout(resolve, 50));
    const guarded = withExecutionGuard(slowFn, () => { skipped = true; });

    const firstCall = guarded();
    await guarded();

    expect(skipped).toBe(true);
    await firstCall;
  });

  it('allows calls after the previous one finishes', async () => {
    let callCount = 0;
    const fn = async () => { callCount++; };
    const guarded = withExecutionGuard(fn);

    await guarded();
    await guarded();

    expect(callCount).toBe(2);
  });
});

describe('readIntervalMs', () => {
  it('returns default when Convex is unavailable', async () => {
    const result = await readIntervalMs();
    expect(result).toBe(30_000);
  });
});
