import { ConvexHttpClient } from 'convex/browser';
import { createConvexClient, getConvexUrl } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { runAllProjects } from './orchestrator';
import type { OrchestratorConfig } from './types';
import { DEFAULT_CONFIG } from './types';

/**
 * AutoRunner periodically triggers orchestrator runs for all active projects
 * using a configurable interval that is re-read on each tick.
 */
export class AutoRunner {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly config: OrchestratorConfig;
  private readonly getIntervalMs: () => number;

  constructor(
    getIntervalMs: () => number,
    config: OrchestratorConfig = DEFAULT_CONFIG,
  ) {
    this.getIntervalMs = getIntervalMs;
    this.config = config;
  }

  /**
   * Starts the auto-run loop. Non-blocking.
   */
  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.tick();
  }

  /**
   * Stops the auto-run loop.
   */
  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private tick(): void {
    if (!this.running) {
      return;
    }

    const intervalMs = this.getIntervalMs();
    const effectiveMs = intervalMs > 0 ? intervalMs : 5000;

    this.timerId = setTimeout(async () => {
      if (!this.running) {
        return;
      }
      try {
        await runAllProjects(this.config);
      } catch (err) {
        console.error('AutoRunner tick error:', err);
      }
      this.tick();
    }, effectiveMs);
  }
}

/**
 * Reads the orchestrator interval from Convex settings.
 * Returns interval in milliseconds, or 0 if disabled.
 */
export async function readIntervalMs(): Promise<number> {
  try {
    const client = createConvexClient();
    const setting = await client.query(
      api.fleetCatalog.getSetting,
      { scope: 'orchestrator', key: 'intervalSeconds' },
    );
    if (setting && typeof (setting as any).valueJson === 'string') {
      const seconds = JSON.parse((setting as any).valueJson);
      if (typeof seconds === 'number' && seconds > 0) {
        return seconds * 1000;
      }
    }
  } catch {
    // If Convex is unavailable, default to 30s
  }
  return 30_000;
}

/**
 * CLI entrypoint: runs the auto-runner loop.
 */
export async function runAutoRunner(): Promise<void> {
  const intervalSec = Number(process.env.ORCHESTRATOR_INTERVAL ?? '0');
  let getInterval: () => number;

  if (intervalSec > 0) {
    getInterval = () => intervalSec * 1000;
  } else {
    // Poll Convex for interval setting
    let cachedInterval = 30_000;
    getInterval = () => cachedInterval;
    // Refresh interval every tick
    const origGetInterval = getInterval;
    getInterval = () => {
      readIntervalMs().then((ms) => {
        cachedInterval = ms > 0 ? ms : 30_000;
      });
      return cachedInterval;
    };
  }

  const runner = new AutoRunner(getInterval);
  console.log('AutoRunner started. Press Ctrl+C to stop.');
  runner.start();

  process.on('SIGINT', () => {
    console.log('\nAutoRunner stopping...');
    runner.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    runner.stop();
    process.exit(0);
  });
}
