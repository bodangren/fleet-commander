import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { typedQuery } from '../convexClient';
import { executeRetrospectiveGeneration } from '../routes/retrospectives';

/**
 * Weekly scheduler for automatic retrospective generation.
 * Follows the same setTimeout-recursive pattern as PolicyStatsScheduler.
 */
export class RetrospectiveScheduler {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private readonly intervalMs: number;

  constructor(
    private readonly client: ConvexHttpClient,
    intervalMs = 7 * 24 * 60 * 60 * 1000, // 1 week default
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
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private tick(): void {
    if (!this.running) return;

    this.timerId = setTimeout(async () => {
      if (!this.running) return;
      try {
        await this.runScheduledRetrospectives();
      } catch (err) {
        console.error('RetrospectiveScheduler tick failed:', err);
      }
      this.tick();
    }, this.intervalMs);
  }

  private async runScheduledRetrospectives(): Promise<void> {
    // Find sprints that ended within the last interval and don't have a retrospective yet.
    const now = Date.now();
    const cutoff = now - this.intervalMs;

    try {
      const projects = await typedQuery(this.client, api.projects.listProjectsHandler, {});

      for (const project of projects) {
        const sprints = await typedQuery(this.client, api.sprints.listSprintsHandler, {
          projectId: project._id,
        });

        for (const sprint of sprints) {
          const endDate = sprint.closedAt ?? sprint.startedAt ?? sprint.createdAt;
          if (endDate < cutoff || endDate > now) continue;

          const sprintId = sprint._id as Id<'sprints'>;
          const existing = await typedQuery(this.client, api.retrospectives.listRetrospectives, {
            sprintId,
            limit: 1,
          });

          if (existing.length > 0) continue;

          // Call the generation function directly instead of self-HTTP fetch.
          // Fire and forget to avoid blocking the scheduler tick.
          executeRetrospectiveGeneration(
            this.client,
            sprintId,
            'scheduled',
          ).catch((err) => {
            console.error(
              `Scheduled retrospective generation failed for sprint ${sprintId}:`,
              err instanceof Error ? err.message : String(err),
            );
          });
        }
      }
    } catch (err) {
      console.error('Failed to run scheduled retrospectives:', err);
    }
  }
}
