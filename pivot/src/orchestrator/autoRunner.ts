import { ConvexHttpClient } from 'convex/browser';
import { createConvexClient, getConvexUrl } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { runAllProjects } from './orchestrator';
import type { GitHooks, OrchestratorConfig, QualityWorkflowHooks } from './types';
import { DEFAULT_CONFIG } from './types';
import { withExecutionGuard } from './executionGuard';
import { createAutoPushGitHooks } from './gitOrchestrator';
import { config } from '../config';

export interface AutoRunnerDeps {
  /**
   * Returns `true` when the continuous-mode toggle is on and the runner should
   * dispatch this tick. Returning `false` skips the tick (but the timer keeps
   * ticking so a flip back to enabled resumes work). Defaults to always-on.
   */
  isEnabled?: () => Promise<boolean> | boolean;
  /**
   * Overrides the production `runAllProjects` call. Used by tests to observe
   * tick behavior without spinning up the full orchestrator pipeline. Receives
   * the configured `gitHooks` as its second argument so tests can assert they
   * are threaded through.
   */
  runAll?: (config: OrchestratorConfig, gitHooks?: GitHooks, qualityWorkflowHooks?: QualityWorkflowHooks) => Promise<unknown>;
  /**
   * Git lifecycle hooks (branch/commit/merge/cleanup) forwarded to
   * `runAllProjects` on every tick. Without these the orchestrator's git stage
   * is a no-op, so production MUST supply them; tests may omit them.
   */
  gitHooks?: GitHooks;
  /**
   * Quality workflow hooks (runner, profile resolver, snapshot recorder)
   * forwarded to `runAllProjects` on every tick. Without these the quality
   * workflow stages will fail closed instead of using a fake pass-through.
   */
  qualityWorkflowHooks?: QualityWorkflowHooks;
}

/**
 * AutoRunner periodically triggers orchestrator runs for all active projects.
 *
 * Each tick first consults `isEnabled` (when provided); ticks are skipped
 * while the toggle is off so the production hot-path respects the
 * `continuousMode.enabled` UI switch. The interval is re-read on every tick
 * via `getIntervalMs`.
 *
 * @param getIntervalMs - Returns the desired ms between ticks. Values ≤ 0 are
 *   coerced to a 5s safety floor.
 * @param config - Orchestrator configuration forwarded to `runAllProjects`.
 * @param deps.isEnabled - Optional async gate; when it resolves to `false`,
 *   the runner skips the tick without stopping the timer.
 * @param deps.runAll - Optional injection point for tests.
 */
export class AutoRunner {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly config: OrchestratorConfig;
  private readonly getIntervalMs: () => number;
  private readonly isEnabled: () => Promise<boolean> | boolean;
  private readonly guardedRunAllProjects: () => Promise<unknown>;

  constructor(
    getIntervalMs: () => number,
    config: OrchestratorConfig = DEFAULT_CONFIG,
    deps: AutoRunnerDeps = {},
  ) {
    this.getIntervalMs = getIntervalMs;
    this.config = config;
    this.isEnabled = deps.isEnabled ?? (() => true);
    const gitHooks = deps.gitHooks;
    const qualityWorkflowHooks = deps.qualityWorkflowHooks;
    const runAll =
      deps.runAll ??
      ((cfg: OrchestratorConfig, gh?: GitHooks, qh?: QualityWorkflowHooks) =>
        runAllProjects(cfg, undefined, gh, undefined, qh));
    this.guardedRunAllProjects = withExecutionGuard(
      () => runAll(this.config, gitHooks, qualityWorkflowHooks),
      () => console.warn('[AutoRunner] Skipping overlapping runAllProjects cycle'),
    );
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
        const enabled = await this.isEnabled();
        if (enabled) {
          await this.guardedRunAllProjects();
        }
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
 * Reads the global continuous-mode toggle from Convex. Returns `true` when
 * the UI switch (`api.continuousMode.setContinuousMode`) has been flipped on
 * and `false` otherwise (including Convex failures, which fail closed).
 */
export async function isContinuousModeEnabled(client?: ConvexHttpClient): Promise<boolean> {
  const c = client ?? createConvexClient();
  try {
    const status = await c.query(api.continuousMode.getContinuousModeStatus, {});
    if (status && typeof (status as { enabled?: unknown }).enabled === 'boolean') {
      return (status as { enabled: boolean }).enabled;
    }
    return false;
  } catch {
    return false;
  }
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
    let cachedInterval = 30_000;
    getInterval = () => cachedInterval;
    const origGetInterval = getInterval;
    getInterval = () => {
      readIntervalMs().then((ms) => {
        cachedInterval = ms > 0 ? ms : 30_000;
      });
      return cachedInterval;
    };
  }

  const runner = new AutoRunner(getInterval, DEFAULT_CONFIG, {
    isEnabled: () => isContinuousModeEnabled(),
    gitHooks: createAutoPushGitHooks(config.git.autoPush),
  });
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
