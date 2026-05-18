import type { Agent, Task, StageResult, StageExecutor } from '../agentTypes.js';
import { calculateStageCost } from '../costTracker.js';

export interface ArchitectContext {
  task: Task;
  agent: Agent;
}

/**
 * Stub architect stage executor.
 * In production, this would call an LLM to generate an implementation plan.
 */
export class ArchitectExecutor implements StageExecutor {
  async execute(
    task: Task,
    agent: Agent,
  ): Promise<StageResult> {
    const startedAt = Date.now();

    // Simulate planning work
    await this.simulatePlanning(task);

    const cost = calculateStageCost('architect', agent, task);

    return {
      stage: 'architect',
      status: 'completed',
      agentId: agent._id,
      cost,
      output: `Architecture plan generated for "${task.title}" by ${agent.name}. ` +
        `Approach: modular design, 3 components, test coverage required.`,
      startedAt,
      completedAt: Date.now(),
    };
  }

  private async simulatePlanning(_task: Task): Promise<void> {
    // Stub: in production, this would be an LLM call
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
