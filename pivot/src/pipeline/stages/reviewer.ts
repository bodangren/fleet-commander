import type { Agent, Task, StageResult, StageExecutor } from '../agentTypes.js';
import { calculateStageCost } from '../costTracker.js';

export interface ReviewerOptions {
  /** Probability of rejection (0-1). Default 0.1 for stub. */
  rejectionRate?: number;
}

/**
 * Stub reviewer stage.
 * In production, this would analyze diffs and test results via LLM.
 */
export class ReviewerAgent implements StageExecutor {
  constructor(private readonly options: ReviewerOptions = {}) {}

  async execute(
    task: Task,
    agent: Agent,
  ): Promise<StageResult> {
    const startedAt = Date.now();

    await this.simulateReview(task);

    const cost = calculateStageCost('reviewer', agent, task);

    // Deterministic stub: reject tasks with "bug" or "fail" in description
    const shouldReject =
      task.description.toLowerCase().includes('bug') ||
      task.description.toLowerCase().includes('fail');

    if (shouldReject) {
      return {
        stage: 'reviewer',
        status: 'failed',
        agentId: agent._id,
        cost,
        error: `Review failed: "${task.title}" has known issues in description. ` +
          `Feedback: Address the flagged concerns before merge.`,
        startedAt,
        completedAt: Date.now(),
      };
    }

    return {
      stage: 'reviewer',
      status: 'completed',
      agentId: agent._id,
      cost,
      output: `Code review approved for "${task.title}" by ${agent.name}. ` +
        `Quality checks: lint passed, tests passed, coverage >80%.`,
      startedAt,
      completedAt: Date.now(),
    };
  }

  private async simulateReview(_task: Task): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
