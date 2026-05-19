import { describe, it, expect } from 'bun:test';
import {
  scoreTaskForSprint,
  findBestAgentForTask,
  generateRecommendation,
} from './recommender.js';
import type { Agent, Task } from '../pipeline/agentTypes.js';

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

describe('scoreTaskForSprint', () => {
  it('scores high priority tasks higher', () => {
    const high: Task = {
      _id: 't1',
      projectId: 'p1',
      title: 'A',
      description: 'x',
      storyPoints: 3,
      status: 'backlog',
      priority: 'high',
      costEstimate: 0,
      createdAt: 0,
      updatedAt: 0,
    };
    const low: Task = {
      _id: 't2',
      projectId: 'p1',
      title: 'B',
      description: 'x',
      storyPoints: 3,
      status: 'backlog',
      priority: 'low',
      costEstimate: 0,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(scoreTaskForSprint(high)).toBeGreaterThan(scoreTaskForSprint(low));
  });

  it('penalizes very large tasks', () => {
    const normal: Task = {
      _id: 't1',
      projectId: 'p1',
      title: 'A',
      description: 'x',
      storyPoints: 5,
      status: 'backlog',
      priority: 'medium',
      costEstimate: 0,
      createdAt: 0,
      updatedAt: 0,
    };
    const large: Task = {
      _id: 't2',
      projectId: 'p1',
      title: 'B',
      description: 'x',
      storyPoints: 10,
      status: 'backlog',
      priority: 'medium',
      costEstimate: 0,
      createdAt: 0,
      updatedAt: 0,
    };
    // 10 pts gets -2 penalty
    expect(scoreTaskForSprint(large)).toBeLessThan(scoreTaskForSprint(normal) + 5);
  });
});

describe('findBestAgentForTask', () => {
  it('prefers agents with matching skills', () => {
    const task: Task = {
      _id: 't1',
      projectId: 'p1',
      title: 'API',
      description: 'node postgresql backend',
      storyPoints: 3,
      status: 'backlog',
      priority: 'high',
      costEstimate: 0,
      createdAt: 0,
      updatedAt: 0,
    };
    const best = findBestAgentForTask(task, [alice, bob, carol]);
    expect(best).toBeDefined();
    expect(best!._id).toBe(bob._id);
  });

  it('returns undefined when no agents available', () => {
    const busy: Agent = { ...alice, workload: 5 };
    const task: Task = {
      _id: 't1',
      projectId: 'p1',
      title: 'X',
      description: 'x',
      storyPoints: 1,
      status: 'backlog',
      priority: 'low',
      costEstimate: 0,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(findBestAgentForTask(task, [busy])).toBeUndefined();
  });
});

describe('generateRecommendation', () => {
  const tasks: Task[] = [
    {
      _id: 't1',
      projectId: 'p1',
      title: 'Auth',
      description: 'node api auth',
      storyPoints: 5,
      status: 'backlog',
      priority: 'high',
      costEstimate: 0,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      _id: 't2',
      projectId: 'p1',
      title: 'UI',
      description: 'react typescript component',
      storyPoints: 3,
      status: 'backlog',
      priority: 'medium',
      costEstimate: 0,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      _id: 't3',
      projectId: 'p1',
      title: 'Tests',
      description: 'playwright testing e2e',
      storyPoints: 2,
      status: 'backlog',
      priority: 'low',
      costEstimate: 0,
      createdAt: 0,
      updatedAt: 0,
    },
  ];

  it('recommends backlog tasks sorted by priority', () => {
    const rec = generateRecommendation(tasks, [alice, bob, carol]);
    expect(rec.tasks.length).toBeGreaterThan(0);
    expect(rec.tasks[0].priority).toBe('high');
    expect(rec.totalPoints).toBeGreaterThan(0);
    expect(rec.totalCost).toBeGreaterThan(0);
  });

  it('respects budget constraint', () => {
    const rec = generateRecommendation(tasks, [alice, bob, carol], 10);
    expect(rec.totalCost).toBeLessThanOrEqual(10);
  });

  it('includes agent breakdown', () => {
    const rec = generateRecommendation(tasks, [alice, bob, carol]);
    expect(rec.agentBreakdown.length).toBeGreaterThan(0);
    const bobBreakdown = rec.agentBreakdown.find((b) => b.agentName === 'bob');
    if (bobBreakdown) {
      expect(bobBreakdown.totalPoints).toBeGreaterThan(0);
      expect(bobBreakdown.totalCost).toBeGreaterThan(0);
    }
  });

  it('calculates recommended budget with buffer', () => {
    const rec = generateRecommendation(tasks, [alice, bob, carol]);
    expect(rec.recommendedBudget).toBeGreaterThan(rec.totalCost);
    expect(rec.bufferPercent).toBe(10);
  });

  it('excludes non-backlog tasks', () => {
    const readyTask: Task = { ...tasks[0], _id: 't-ready', status: 'ready' };
    const rec = generateRecommendation([...tasks, readyTask], [alice, bob, carol]);
    const ids = rec.tasks.map((t) => t.taskId);
    expect(ids).not.toContain('t-ready');
  });

  it('provides maxPointsAtBudget function', () => {
    const rec = generateRecommendation(tasks, [alice, bob, carol]);
    expect(rec.maxPointsAtBudget(0)).toBe(0);
    if (rec.avgCostPerPoint > 0) {
      expect(rec.maxPointsAtBudget(rec.avgCostPerPoint * 10)).toBe(10);
    }
  });
});
