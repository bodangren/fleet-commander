import { describe, it, expect } from 'bun:test';
import {
  PipelineOrchestrator,
  findAgentForStage,
  getCurrentStage,
} from './orchestrator.js';
import type { Agent, Task, StageExecutor, StageResult } from './agentTypes.js';

const alice: Agent = {
  _id: 'agent-alice',
  name: 'alice',
  role: 'architect',
  skills: ['react', 'typescript'],
  model: 'claude-opus',
  costPerPoint: 4.2,
  reliability: 0.95,
  status: 'active',
  workload: 0,
  maxWorkload: 5,
  createdAt: Date.now(),
};

const bob: Agent = {
  _id: 'agent-bob',
  name: 'bob',
  role: 'executor',
  skills: ['node', 'postgresql'],
  model: 'claude-sonnet',
  costPerPoint: 2.1,
  reliability: 0.92,
  status: 'active',
  workload: 0,
  maxWorkload: 5,
  createdAt: Date.now(),
};

const carol: Agent = {
  _id: 'agent-carol',
  name: 'carol',
  role: 'reviewer',
  skills: ['testing', 'playwright'],
  model: 'gpt-4o',
  costPerPoint: 1.8,
  reliability: 0.88,
  status: 'active',
  workload: 0,
  maxWorkload: 5,
  createdAt: Date.now(),
};

const frank: Agent = {
  _id: 'agent-frank',
  name: 'frank',
  role: 'merger',
  skills: ['git', 'ci-cd'],
  model: 'gemini-pro',
  costPerPoint: 1.2,
  reliability: 0.9,
  status: 'active',
  workload: 0,
  maxWorkload: 5,
  createdAt: Date.now(),
};

const baseTask: Task = {
  _id: 'task-1',
  projectId: 'proj-1',
  title: 'Build API',
  description: 'node postgresql api-design',
  storyPoints: 3,
  status: 'ready',
  priority: 'high',
  costEstimate: 6.3,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('getCurrentStage', () => {
  it('returns dispatch for ready tasks', () => {
    expect(getCurrentStage({ ...baseTask, status: 'ready' })).toBe('dispatch');
  });

  it('returns dispatch for backlog tasks', () => {
    expect(getCurrentStage({ ...baseTask, status: 'backlog' })).toBe('dispatch');
  });

  it('returns dispatch for blocked tasks', () => {
    expect(getCurrentStage({ ...baseTask, status: 'blocked' })).toBe('dispatch');
  });

  it('returns dispatch for in_progress without assignee', () => {
    expect(getCurrentStage({ ...baseTask, status: 'in_progress' })).toBe('dispatch');
  });

  it('returns architect for in_progress with assignee', () => {
    expect(
      getCurrentStage({ ...baseTask, status: 'in_progress', assigneeId: 'agent-bob' }),
    ).toBe('architect');
  });

  it('returns reviewer for review tasks', () => {
    expect(getCurrentStage({ ...baseTask, status: 'review' })).toBe('reviewer');
  });
});

describe('findAgentForStage', () => {
  it('finds an architect for architect stage', () => {
    const agent = findAgentForStage('architect', [alice, bob, carol, frank], baseTask);
    expect(agent).toBeDefined();
    expect(agent!._id).toBe(alice._id);
  });

  it('finds an executor for executor stage', () => {
    const agent = findAgentForStage('executor', [alice, bob, carol, frank], baseTask);
    expect(agent!._id).toBe(bob._id);
  });

  it('returns undefined when no agent of required role is available', () => {
    const offline: Agent = { ...alice, status: 'offline' };
    const agent = findAgentForStage('architect', [offline], baseTask);
    expect(agent).toBeUndefined();
  });
});

describe('PipelineOrchestrator', () => {
  it('runs a full pipeline for a ready task', async () => {
    const orchestrator = new PipelineOrchestrator();
    const result = await orchestrator.runTask(baseTask, [alice, bob, carol, frank]);

    expect(result.taskId).toBe(baseTask._id);
    expect(result.stages.length).toBe(5); // dispatch + 4 stages
    expect(result.stages[0].stage).toBe('dispatch');
    expect(result.stages[1].stage).toBe('architect');
    expect(result.stages[2].stage).toBe('executor');
    expect(result.stages[3].stage).toBe('reviewer');
    expect(result.stages[4].stage).toBe('merger');
    expect(result.finalStatus).toBe('done');
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it('skips pipeline when no agents are available', async () => {
    const orchestrator = new PipelineOrchestrator();
    const busyBob: Agent = { ...bob, workload: 5 };
    const busyAlice: Agent = { ...alice, workload: 5 };
    const busyCarol: Agent = { ...carol, workload: 5 };
    const busyFrank: Agent = { ...frank, workload: 5 };
    const result = await orchestrator.runTask(baseTask, [
      busyAlice,
      busyBob,
      busyCarol,
      busyFrank,
    ]);

    expect(result.stages.length).toBe(1);
    expect(result.stages[0].status).toBe('skipped');
    expect(result.finalStatus).toBe('ready');
    expect(result.totalCost).toBe(0);
  });

  it('fails pipeline when a stage executor fails', async () => {
    const failingExecutor: StageExecutor = {
      async execute(): Promise<StageResult> {
        return {
          stage: 'executor',
          status: 'failed',
          cost: 0,
          error: 'Simulated failure',
          startedAt: Date.now(),
          completedAt: Date.now(),
        };
      },
    };

    const orchestrator = new PipelineOrchestrator({
      stages: { executor: failingExecutor },
    });
    const result = await orchestrator.runTask(baseTask, [alice, bob, carol, frank]);

    expect(result.stages[2].status).toBe('failed');
    expect(result.stages[2].stage).toBe('executor');
    expect(result.finalStatus).toBe('ready'); // returns to ready on failure
    expect(result.stages.length).toBe(3); // stops after executor fails
  });

  it('blocks task after max retries exceeded', async () => {
    const failingReviewer: StageExecutor = {
      async execute(): Promise<StageResult> {
        return {
          stage: 'reviewer',
          status: 'failed',
          cost: 0,
          error: 'Simulated review failure',
          startedAt: Date.now(),
          completedAt: Date.now(),
        };
      },
    };

    const orchestrator = new PipelineOrchestrator({
      stages: { reviewer: failingReviewer },
    });
    const result = await orchestrator.runTask(baseTask, [alice, bob, carol, frank], 3);

    expect(result.stages[3].status).toBe('failed');
    expect(result.finalStatus).toBe('blocked');
  });

  it('rejects tasks with bug in description', async () => {
    const bugTask: Task = {
      ...baseTask,
      description: 'has a bug in the logic',
    };
    const orchestrator = new PipelineOrchestrator();
    const result = await orchestrator.runTask(bugTask, [alice, bob, carol, frank]);

    expect(result.stages[3].status).toBe('failed'); // reviewer rejects
    expect(result.stages[3].stage).toBe('reviewer');
    expect(result.finalStatus).toBe('ready');
  });

  it('accumulates costs across all completed stages', async () => {
    const orchestrator = new PipelineOrchestrator();
    const result = await orchestrator.runTask(baseTask, [alice, bob, carol, frank]);

    const expectedCost =
      result.stages[1].cost + // architect
      result.stages[2].cost + // executor
      result.stages[3].cost + // reviewer
      result.stages[4].cost; // merger

    expect(result.totalCost).toBeCloseTo(expectedCost, 2);
  });
});
