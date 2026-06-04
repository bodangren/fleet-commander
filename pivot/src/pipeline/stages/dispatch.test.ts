import { describe, it, expect } from 'bun:test';
import { scoreAgentMatch, findBestAgent, executeDispatch } from './dispatch.js';
import type { Agent, Task } from '../agentTypes.js';
import type { ModelHistoricalData } from '../../policy/modelRouter.js';

const baseTask: Task = {
  _id: 'task-1',
  projectId: 'proj-1',
  title: 'Build API',
  description: 'node postgresql api-design backend',
  storyPoints: 3,
  status: 'ready',
  priority: 'high',
  costEstimate: 6.3,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const alice: Agent = {
  _id: 'agent-alice',
  name: 'alice',
  role: 'architect',
  skills: ['react', 'typescript', 'ui-design'],
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
  skills: ['node', 'postgresql', 'api-design'],
  model: 'claude-sonnet',
  costPerPoint: 2.1,
  reliability: 0.92,
  status: 'active',
  workload: 1,
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
  workload: 4,
  maxWorkload: 5,
  createdAt: Date.now(),
};

const busyBob: Agent = {
  ...bob,
  _id: 'agent-bob-busy',
  workload: 5,
};

describe('scoreAgentMatch', () => {
  it('gives higher score for skill overlap', () => {
    const aliceScore = scoreAgentMatch(alice, baseTask);
    const bobScore = scoreAgentMatch(bob, baseTask);
    // bob has node, postgresql, api-design — all match task description
    // alice has react, typescript, ui-design — none match
    expect(bobScore).toBeGreaterThan(aliceScore);
  });

  it('penalizes high workload', () => {
    const freeBob = scoreAgentMatch(bob, baseTask);
    const busy = scoreAgentMatch(carol, baseTask); // workload 4/5
    expect(freeBob).toBeGreaterThan(busy);
  });

  it('rewards high reliability', () => {
    const reliable = scoreAgentMatch(alice, baseTask);
    const lessReliable: Agent = { ...alice, reliability: 0.5 };
    const lower = scoreAgentMatch(lessReliable, baseTask);
    expect(reliable).toBeGreaterThan(lower);
  });
});

describe('findBestAgent', () => {
  it('returns the best matching available agent', () => {
    const best = findBestAgent(baseTask, [alice, bob, carol]);
    expect(best).toBeDefined();
    expect(best!._id).toBe(bob._id); // bob matches skills best
  });

  it('returns undefined when no agents are available', () => {
    const best = findBestAgent(baseTask, [busyBob]);
    expect(best).toBeUndefined();
  });

  it('returns undefined for empty agent list', () => {
    expect(findBestAgent(baseTask, [])).toBeUndefined();
  });

  it('excludes offline or blocked agents', () => {
    const offline: Agent = { ...alice, status: 'offline' };
    const blocked: Agent = { ...bob, status: 'blocked' };
    const best = findBestAgent(baseTask, [offline, blocked, carol]);
    expect(best!._id).toBe(carol._id);
  });
});

describe('executeDispatch', () => {
  it('assigns a ready task to the best agent', () => {
    const result = executeDispatch(baseTask, [alice, bob, carol]);
    expect(result.assigned).toBe(true);
    expect(result.agentId).toBe(bob._id);
    expect(result.stageResult.status).toBe('completed');
    expect(result.stageResult.output).toContain('bob');
  });

  it('skips when task is not ready', () => {
    const task: Task = { ...baseTask, status: 'in_progress' };
    const result = executeDispatch(task, [alice, bob]);
    expect(result.assigned).toBe(false);
    expect(result.stageResult.status).toBe('skipped');
  });

  it('skips when no agents are available', () => {
    const result = executeDispatch(baseTask, [busyBob]);
    expect(result.assigned).toBe(false);
    expect(result.stageResult.status).toBe('skipped');
    expect(result.stageResult.output).toContain('No available agent');
  });
});

describe('executeDispatch with model routing', () => {
  const historicalData: ModelHistoricalData[] = [
    { model: 'gpt-4o', role: 'executor', taskType: 'feature', sampleCount: 10, avgCostPerPoint: 0.3, rejectionRate: 0.05, avgDurationMs: 5000 },
    { model: 'gpt-4o-mini', role: 'executor', taskType: 'feature', sampleCount: 8, avgCostPerPoint: 0.05, rejectionRate: 0.15, avgDurationMs: 3000 },
    { model: 'claude-3-opus', role: 'executor', taskType: 'feature', sampleCount: 12, avgCostPerPoint: 0.8, rejectionRate: 0.02, avgDurationMs: 8000 },
  ];

  it('returns no model selection when policy is not provided', () => {
    const result = executeDispatch(baseTask, [alice, bob, carol]);
    expect(result.assigned).toBe(true);
    expect(result.modelSelection).toBeUndefined();
    expect(result.fallbackChain).toBeUndefined();
  });

  it('returns no model selection when policy is manual', () => {
    const result = executeDispatch(baseTask, [alice, bob, carol], {
      routingPolicy: 'manual',
    });
    expect(result.assigned).toBe(true);
    expect(result.modelSelection).toBeUndefined();
  });

  it('selects model under balanced policy', () => {
    const result = executeDispatch(baseTask, [alice, bob, carol], {
      routingPolicy: 'balanced',
      historicalData,
    });
    expect(result.assigned).toBe(true);
    expect(result.modelSelection).toBeDefined();
    expect(result.modelSelection!.selectedModel).toBeTruthy();
    expect(result.modelSelection!.policy).toBe('balanced');
    expect(result.fallbackChain).toBeDefined();
    expect(result.fallbackChain!.length).toBeGreaterThan(0);
  });

  it('selects model under cost_first policy', () => {
    const result = executeDispatch(baseTask, [alice, bob, carol], {
      routingPolicy: 'cost_first',
      historicalData,
    });
    expect(result.modelSelection).toBeDefined();
    expect(result.modelSelection!.selectedModel).toBe('gpt-4o-mini');
    expect(result.modelSelection!.policy).toBe('cost_first');
  });

  it('selects model under quality_first policy', () => {
    const result = executeDispatch(baseTask, [alice, bob, carol], {
      routingPolicy: 'quality_first',
      historicalData,
    });
    expect(result.modelSelection).toBeDefined();
    expect(result.modelSelection!.selectedModel).toBe('claude-3-opus');
    expect(result.modelSelection!.policy).toBe('quality_first');
  });

  it('includes model info in stage output', () => {
    const result = executeDispatch(baseTask, [alice, bob, carol], {
      routingPolicy: 'balanced',
      historicalData,
    });
    expect(result.stageResult.output).toContain('model:');
    expect(result.stageResult.output).toContain('balanced');
  });

  it('builds fallback chain with primary as first entry', () => {
    const result = executeDispatch(baseTask, [alice, bob, carol], {
      routingPolicy: 'balanced',
      historicalData,
    });
    expect(result.fallbackChain).toBeDefined();
    expect(result.fallbackChain![0].triggerCondition).toBe('primary');
  });

  it('uses default scores when no historical data available', () => {
    const result = executeDispatch(baseTask, [alice, bob, carol], {
      routingPolicy: 'balanced',
      historicalData: [],
    });
    expect(result.modelSelection).toBeDefined();
    expect(result.modelSelection!.confidence).toBe(0);
  });
});
