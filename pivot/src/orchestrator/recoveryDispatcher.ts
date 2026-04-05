import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { StalledTaskDetector, TaskWithStartedAt } from './stalledDetector';
import { CircuitBreaker } from './circuitBreaker';
import type { RecoveryEventType } from './types';

export interface RecoveryAction {
  taskId: string;
  action: 'retry' | 'reroute' | 'requeue' | 'block';
  agentId?: string;
  reason: string;
}

export class RecoveryDispatcher {
  private stalledDetector: StalledTaskDetector;
  private client: ConvexHttpClient;

  constructor(client: ConvexHttpClient, timeoutMs = 600_000) {
    this.client = client;
    this.stalledDetector = new StalledTaskDetector(timeoutMs);
  }

  async runHealthCheck(): Promise<RecoveryAction[]> {
    const actions: RecoveryAction[] = [];

    const inProgressTasks = await this.client.query(api.taskRecovery.getInProgressTasks, {});
    const tasksWithStarted = inProgressTasks as unknown as TaskWithStartedAt[];

    const stalled = this.stalledDetector.detectStalled(tasksWithStarted, Date.now());

    for (const task of stalled) {
      const action = await this.handleStalledTask(task);
      actions.push(action);
    }

    return actions;
  }

  private async handleStalledTask(task: TaskWithStartedAt): Promise<RecoveryAction> {
    const agentId = task.assignee ?? 'unknown';

    try {
      const circuitState = await this.client.mutation(api.circuitBreakers.evaluateCircuitState, {
        agentId,
      });

      if (circuitState === 'open') {
        await this.logRecoveryEvent(task.taskKey, agentId, 'stalled',
          `Task stalled, agent ${agentId} circuit breaker open — requeuing`);
        return {
          taskId: task.taskKey,
          action: 'requeue',
          reason: `Agent ${agentId} circuit breaker open`,
        };
      }

      await this.logRecoveryEvent(task.taskKey, agentId, 'stalled',
        `Task stalled, retrying with same agent ${agentId}`);
      return {
        taskId: task.taskKey,
        action: 'retry',
        agentId,
        reason: 'Task stalled, auto-retrying',
      };
    } catch {
      await this.logRecoveryEvent(task.taskKey, agentId, 'stalled',
        `Task stalled, circuit breaker unavailable — requeuing`);
      return {
        taskId: task.taskKey,
        action: 'requeue',
        reason: 'Circuit breaker service unavailable',
      };
    }
  }

  private async logRecoveryEvent(
    taskId: string,
    agentId: string,
    eventType: RecoveryEventType,
    details: string,
  ): Promise<void> {
    try {
      await this.client.mutation(api.recoveryLog.logRecoveryEvent, {
        taskId,
        agentId,
        eventType,
        details,
      });
    } catch {
      console.error(`Failed to log recovery event for task ${taskId}:`, eventType);
    }
  }
}

export class HealthCheckLoop {
  private dispatcher: RecoveryDispatcher;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly intervalMs: number;

  constructor(client: ConvexHttpClient, intervalMs = 60_000, timeoutMs = 600_000) {
    this.dispatcher = new RecoveryDispatcher(client, timeoutMs);
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
        const actions = await this.dispatcher.runHealthCheck();
        if (actions.length > 0) {
          console.log(`Health check: ${actions.length} recovery action(s) triggered`);
          for (const action of actions) {
            console.log(`  - ${action.taskId}: ${action.action} (${action.reason})`);
          }
        }
      } catch (err) {
        console.error('Health check loop error:', err);
      }
      this.tick();
    }, this.intervalMs);
  }

  isRunning(): boolean {
    return this.running;
  }
}
