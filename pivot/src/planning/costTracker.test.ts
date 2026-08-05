import { describe, it, expect } from 'bun:test';
import {
  calculateStageCost,
  calculateTotalEstimate,
  sumStageCosts,
} from './costTracker.js';
import type { Agent, Task } from './agentTypes.js';

const mockAgent: Agent = {
  _id: 'agent-1',
  name: 'alice',
  role: 'architect',
  skills: ['react', 'typescript'],
  model: 'claude-opus',
  costPerPoint: 4.2,
  reliability: 0.95,
  status: 'active',
  workload: 1,
  maxWorkload: 5,
  createdAt: Date.now(),
};

const mockTask: Task = {
  _id: 'task-1',
  projectId: 'project-1',
  title: 'Build auth',
  description: 'Add login flow',
  storyPoints: 5,
  status: 'ready',
  priority: 'high',
  costEstimate: 21.0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('calculateStageCost', () => {
  it('calculates architect cost with 0.3x multiplier', () => {
    const cost = calculateStageCost('architect', mockAgent, mockTask);
    expect(cost).toBe(6.3); // 4.2 * 5 * 0.3
  });

  it('calculates executor cost with 1.0x multiplier', () => {
    const cost = calculateStageCost('executor', mockAgent, mockTask);
    expect(cost).toBe(21.0); // 4.2 * 5 * 1.0
  });

  it('calculates reviewer cost with 0.3x multiplier', () => {
    const cost = calculateStageCost('reviewer', mockAgent, mockTask);
    expect(cost).toBe(6.3);
  });

  it('calculates merger cost with 0.1x multiplier', () => {
    const cost = calculateStageCost('merger', mockAgent, mockTask);
    expect(cost).toBe(2.1); // 4.2 * 5 * 0.1
  });

  it('rounds to 2 decimal places', () => {
    const agent: Agent = { ...mockAgent, costPerPoint: 3.333 };
    const cost = calculateStageCost('architect', agent, mockTask);
    expect(cost).toBe(5.0); // 3.333 * 5 * 0.3 = 4.9995 → 5.0
  });
});

describe('calculateTotalEstimate', () => {
  it('sums all 4 stage costs', () => {
    const total = calculateTotalEstimate(mockAgent, mockTask);
    // architect: 6.3, executor: 21.0, reviewer: 6.3, merger: 2.1
    expect(total).toBe(35.7);
  });

  it('returns 0 for 0 story points', () => {
    const task: Task = { ...mockTask, storyPoints: 0 };
    expect(calculateTotalEstimate(mockAgent, task)).toBe(0);
  });
});

describe('sumStageCosts', () => {
  it('sums an array of costs', () => {
    expect(sumStageCosts([6.3, 21.0, 6.3, 2.1])).toBe(35.7);
  });

  it('returns 0 for empty array', () => {
    expect(sumStageCosts([])).toBe(0);
  });
});
