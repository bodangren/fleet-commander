import type { ConvexHttpClient } from 'convex/browser';
import { recomputePolicyStats } from './recompute';

/**
 * PolicyStatsScheduler triggers policy stats recomputation on a fixed interval.
 */
export class PolicyStatsScheduler {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private readonly intervalMs: number;

  constructor(
    private readonly client: ConvexHttpClient,
    intervalMs = 60 * 60 * 1000, // 1 hour default
  ) {
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private tick(): void {
    if (!this.running) return;

    this.timerId = setTimeout(async () => {
      if (!this.running) return;
      try {
        const result = await recomputePolicyStats(this.client);
        if (result.recomputed) {
          console.log(
            `[policy-stats] recomputed: ${result.dispatchBuckets} dispatch buckets, ${result.harnessNames} harnesses`,
          );
        } else {
          console.log(`[policy-stats] skipped: ${result.reason}`);
        }
      } catch (err) {
        console.error('[policy-stats] recomputation error:', err);
      }
      this.tick();
    }, this.intervalMs);
  }
}
