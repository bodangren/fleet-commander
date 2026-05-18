import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { PipelineOrchestrator } from './orchestrator.js';
import type { Agent, Task } from './agentTypes.js';

export interface PipelineSchedulerOptions {
  intervalMs?: number;
}

/**
 * PipelineScheduler runs the agent pipeline on a fixed interval.
 * Fetches ready tasks and available agents from Convex,
 * runs the orchestrator, and applies state mutations.
 */
export class PipelineScheduler {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private readonly intervalMs: number;
  private readonly orchestrator: PipelineOrchestrator;

  constructor(
    private readonly client: ConvexHttpClient,
    options: PipelineSchedulerOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? 5 * 60 * 1000; // 5 minutes default
    this.orchestrator = new PipelineOrchestrator();
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
        await this.runCycle();
      } catch (err) {
        console.error('[pipeline-scheduler] cycle error:', err);
      }
      this.tick();
    }, this.intervalMs);
  }

  /**
   * Run a single scheduler cycle.
   * Fetches tasks and agents, then processes ready tasks.
   */
  async runCycle(): Promise<void> {
    // Fetch all active agents
    const agents = (await this.client.query(
      api.agents.listAgentsHandler,
      {},
    )) as Agent[];

    // Fetch all projects, then their sprints
    const projects = (await this.client.query(
      api.projects.listProjectsHandler,
      {},
    )) as Array<{ _id: string }>;

    let activeSprints: Array<{ _id: string; projectId: string; status: string }> = [];
    for (const project of projects) {
      const sprints = (await this.client.query(api.sprints.listSprintsHandler, {
        projectId: project._id as any,
      })) as Array<{ _id: string; projectId: string; status: string }>;
      activeSprints = activeSprints.concat(sprints);
    }

    const activeSprintIds = new Set(
      activeSprints.filter((s) => s.status === 'active').map((s) => s._id),
    );

    if (activeSprintIds.size === 0) {
      console.log('[pipeline-scheduler] no active sprints');
      return;
    }

    // Get tasks from each project
    let readyTasks: Task[] = [];
    for (const project of projects) {
      const tasks = (await this.client.query(api.tasks.listTasksHandler, {
        projectId: project._id as any,
      })) as Task[];
      readyTasks = readyTasks.concat(
        tasks.filter((t) => t.status === 'ready' && activeSprintIds.has(t.sprintId!)),
      );
    }

    if (readyTasks.length === 0) {
      console.log('[pipeline-scheduler] no ready tasks');
      return;
    }

    console.log(
      `[pipeline-scheduler] processing ${readyTasks.length} ready tasks with ${agents.length} agents`,
    );

    for (const task of readyTasks) {
      try {
        await this.processTask(task, agents);
      } catch (err) {
        console.error(`[pipeline-scheduler] failed to process task ${task._id}:`, err);
      }
    }
  }

  /**
   * Process a single task through the pipeline.
   */
  private async processTask(task: Task, agents: Agent[]): Promise<void> {
    const execution = await this.orchestrator.runTask(task, agents);

    // Apply stage results to Convex
    for (const stage of execution.stages) {
      if (stage.stage === 'dispatch' && stage.status === 'completed' && stage.agentId) {
        // Assign task to agent
        await this.client.mutation(api.tasks.assignTaskHandler, {
          taskId: task._id as any,
          agentId: stage.agentId as any,
        });
      }

      // Record pipeline run for non-dispatch stages
      if (stage.stage !== 'dispatch' && stage.agentId) {
        const runId = await this.client.mutation(
          api.pipelineRuns.createPipelineRunHandler,
          {
            taskId: task._id as any,
            stage: stage.stage as any,
            agentId: stage.agentId as any,
          },
        );

        if (stage.status === 'completed' || stage.status === 'failed') {
          await this.client.mutation(
            api.pipelineRuns.updatePipelineRunStatusHandler,
            {
              id: runId as any,
              status: stage.status === 'completed' ? 'completed' : 'failed',
              cost: stage.cost,
            },
          );
        }
      }
    }

    // Update final task status
    if (execution.finalStatus !== task.status) {
      await this.client.mutation(api.tasks.updateTaskStatusHandler, {
        id: task._id as any,
        status: execution.finalStatus as any,
      });
    }

    // If task completed, update sprint actualCost
    if (execution.finalStatus === 'done') {
      const taskDoc = (await this.client.query(api.tasks.getTaskHandler, {
        id: task._id as any,
      })) as Task | null;
      if (taskDoc?.sprintId) {
        // Get current sprint cost and add total
        const sprint = (await this.client.query(api.sprints.getSprintHandler, {
          id: taskDoc.sprintId as any,
        })) as { actualCost: number } | null;
        if (sprint) {
          // Note: sprint cost update would need a dedicated mutation
          // For now, the closeSprintHandler calculates from pipeline runs
        }
      }
    }

    console.log(
      `[pipeline-scheduler] task ${task._id} → ${execution.finalStatus} (cost: $${execution.totalCost})`,
    );
  }
}
