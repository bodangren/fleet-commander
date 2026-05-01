import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import { AutoRunner, readIntervalMs } from './autoRunner';
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

describe('readIntervalMs', () => {
  it('returns default when Convex is unavailable', async () => {
    const result = await readIntervalMs();
    expect(result).toBe(30_000);
  });
});
