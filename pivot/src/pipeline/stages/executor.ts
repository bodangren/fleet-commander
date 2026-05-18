import type { Agent, Task, StageResult, StageExecutor } from '../agentTypes.js';
import { calculateStageCost } from '../costTracker.js';

/**
 * Stub executor stage.
 * In production, this would run the agent's CLI tool to write code and tests.
 */
export class ExecutorAgent implements StageExecutor {
  async execute(
    task: Task,
    agent: Agent,
  ): Promise<StageResult> {
    const startedAt = Date.now();

    await this.simulateExecution(task);

    const cost = calculateStageCost('executor', agent, task);

    return {
      stage: 'executor',
      status: 'completed',
      agentId: agent._id,
      cost,
      output: `Code written and tests passed for "${task.title}" by ${agent.name}. ` +
        `Files modified: src/${task.title.toLowerCase().replace(/\s+/g, '-')}.ts, ` +
        `tests/${task.title.toLowerCase().replace(/\s+/g, '-')}.test.ts`,
      startedAt,
      completedAt: Date.now(),
    };
  }

  private async simulateExecution(_task: Task): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
