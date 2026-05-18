import type { Agent, Task, StageResult, StageExecutor } from '../agentTypes.js';
import { calculateStageCost } from '../costTracker.js';

/**
 * Stub merger stage.
 * In production, this would merge the PR and update sprint metrics.
 */
export class MergerAgent implements StageExecutor {
  async execute(
    task: Task,
    agent: Agent,
  ): Promise<StageResult> {
    const startedAt = Date.now();

    await this.simulateMerge(task);

    const cost = calculateStageCost('merger', agent, task);

    return {
      stage: 'merger',
      status: 'completed',
      agentId: agent._id,
      cost,
      output: `Merged "${task.title}" to main by ${agent.name}. ` +
        `Sprint cost updated. Task complete.`,
      startedAt,
      completedAt: Date.now(),
    };
  }

  private async simulateMerge(_task: Task): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
