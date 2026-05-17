import { describe, expect, it } from 'bun:test';
import {
  computeSprintMetrics,
  computeCostTrend,
  computeAgentEfficiency,
  computeROISummary,
  computeOptimizations,
  classifyValueScore,
} from './insights';

// ─── helpers ──────────────────────────────────────────

function makeSprint(overrides: Partial<any> = {}): any {
  return {
    _id: 'sprint-1',
    name: 'Sprint 1',
    status: 'closed',
    budget: 100,
    actualCost: 90,
    pointsDelivered: 10,
    pointsEstimated: 12,
    taskCount: 10,
    completedCount: 8,
    ...overrides,
  };
}

function makeCostRecord(overrides: Partial<any> = {}): any {
  return {
    agentId: 'agent-1',
    projectSlug: 'proj',
    taskId: 'task-1',
    model: 'gpt-4',
    inputTokens: 1000,
    outputTokens: 500,
    costUSD: 0.5,
    sessionResumed: false,
    sessionCostSaved: 0,
    recordedAt: Date.now(),
    ...overrides,
  };
}

function makeAgent(overrides: Partial<any> = {}): any {
  return {
    _id: 'agent-1',
    name: 'alice',
    role: 'architect',
    skills: [],
    model: 'claude-opus',
    costPerPoint: 4.2,
    reliability: 0.95,
    status: 'active',
    workload: 0,
    maxWorkload: 5,
    createdAt: 1000,
    ...overrides,
  };
}

// ─── computeSprintMetrics ─────────────────────────────

describe('computeSprintMetrics', () => {
  it('returns empty array for empty input', () => {
    expect(computeSprintMetrics([])).toEqual([]);
  });

  it('calculates costPerPoint correctly', () => {
    const sprints = [makeSprint({ actualCost: 90, pointsDelivered: 10 })];
    const result = computeSprintMetrics(sprints);
    expect(result[0].costPerPoint).toBe(9);
  });

  it('returns 0 for costPerPoint when pointsDelivered is 0', () => {
    const sprints = [makeSprint({ actualCost: 50, pointsDelivered: 0 })];
    const result = computeSprintMetrics(sprints);
    expect(result[0].costPerPoint).toBe(0);
    expect(Number.isFinite(result[0].costPerPoint)).toBe(true);
  });

  it('calculates budgetAccuracy correctly', () => {
    const sprints = [makeSprint({ budget: 100, actualCost: 90 })];
    const result = computeSprintMetrics(sprints);
    expect(result[0].budgetAccuracy).toBe(10);
  });

  it('returns 0 for budgetAccuracy when budget is 0', () => {
    const sprints = [makeSprint({ budget: 0, actualCost: 50 })];
    const result = computeSprintMetrics(sprints);
    expect(result[0].budgetAccuracy).toBe(0);
    expect(Number.isFinite(result[0].budgetAccuracy)).toBe(true);
  });

  it('calculates velocity as pointsDelivered / taskCount', () => {
    const sprints = [makeSprint({ pointsDelivered: 20, taskCount: 10 })];
    const result = computeSprintMetrics(sprints);
    expect(result[0].velocity).toBe(2);
  });

  it('returns 0 velocity when taskCount is 0', () => {
    const sprints = [makeSprint({ pointsDelivered: 0, taskCount: 0 })];
    const result = computeSprintMetrics(sprints);
    expect(result[0].velocity).toBe(0);
  });

  it('preserves sprint fields', () => {
    const sprints = [makeSprint({ name: 'Alpha Sprint', _id: 'sprint-alpha' })];
    const result = computeSprintMetrics(sprints);
    expect(result[0].name).toBe('Alpha Sprint');
    expect(result[0]._id).toBe('sprint-alpha');
  });

  it('handles multiple sprints', () => {
    const sprints = [
      makeSprint({ _id: 's1', actualCost: 100, pointsDelivered: 20 }),
      makeSprint({ _id: 's2', actualCost: 60, pointsDelivered: 10 }),
    ];
    const result = computeSprintMetrics(sprints);
    expect(result[0].costPerPoint).toBe(5);
    expect(result[1].costPerPoint).toBe(6);
  });
});

// ─── computeCostTrend ─────────────────────────────────

describe('computeCostTrend', () => {
  it('returns empty array for empty sprints', () => {
    expect(computeCostTrend([], [])).toEqual([]);
  });

  it('returns costPerPoint per sprint', () => {
    const sprints = [
      makeSprint({ name: 'Sprint 1', actualCost: 90, pointsDelivered: 10 }),
    ];
    const result = computeCostTrend(sprints, []);
    expect(result[0].sprintName).toBe('Sprint 1');
    expect(result[0].costPerPoint).toBe(9);
    expect(result[0].pointsDelivered).toBe(10);
    expect(result[0].targetCostPerPoint).toBe(2);
  });

  it('handles sprint with zero points', () => {
    const sprints = [makeSprint({ actualCost: 50, pointsDelivered: 0 })];
    const result = computeCostTrend(sprints, []);
    expect(result[0].costPerPoint).toBe(0);
  });

  it('includes all sprints in order', () => {
    const sprints = [
      makeSprint({ name: 'Sprint A', actualCost: 100, pointsDelivered: 20 }),
      makeSprint({ name: 'Sprint B', actualCost: 60, pointsDelivered: 10 }),
    ];
    const result = computeCostTrend(sprints, []);
    expect(result).toHaveLength(2);
    expect(result[0].sprintName).toBe('Sprint A');
    expect(result[1].sprintName).toBe('Sprint B');
  });
});

// ─── classifyValueScore ───────────────────────────────

describe('classifyValueScore', () => {
  it('classifies low costPerPoint as High Value', () => {
    expect(classifyValueScore(1.5)).toBe('High Value');
  });

  it('classifies medium costPerPoint as Standard', () => {
    expect(classifyValueScore(2.5)).toBe('Standard');
  });

  it('classifies high costPerPoint as Premium', () => {
    expect(classifyValueScore(3.5)).toBe('Premium');
  });

  it('handles zero costPerPoint', () => {
    expect(classifyValueScore(0)).toBe('High Value');
  });
});

// ─── computeAgentEfficiency ───────────────────────────

describe('computeAgentEfficiency', () => {
  it('returns empty array for no agents', () => {
    expect(computeAgentEfficiency([], [], [])).toEqual([]);
  });

  it('calculates totals for an agent', () => {
    const agents = [makeAgent({ name: 'alice', model: 'claude-opus' })];
    const tasks = [
      { assigneeId: 'agent-1', storyPoints: 5, status: 'done' },
      { assigneeId: 'agent-1', storyPoints: 3, status: 'done' },
    ];
    const costRecords = [
      makeCostRecord({ agentId: 'agent-1', costUSD: 10 }),
      makeCostRecord({ agentId: 'agent-1', costUSD: 5 }),
    ];
    const result = computeAgentEfficiency(agents, tasks, costRecords);
    expect(result[0].agentName).toBe('alice');
    expect(result[0].model).toBe('claude-opus');
    expect(result[0].totalPoints).toBe(8);
    expect(result[0].totalCost).toBe(15);
    expect(result[0].costPerPoint).toBeCloseTo(1.875);
  });

  it('assigns correct valueScore based on costPerPoint', () => {
    const agents = [makeAgent({ name: 'alice', costPerPoint: 1.5 })];
    const tasks = [{ assigneeId: 'agent-1', storyPoints: 10, status: 'done' }];
    const costRecords = [makeCostRecord({ agentId: 'agent-1', costUSD: 15 })];
    const result = computeAgentEfficiency(agents, tasks, costRecords);
    expect(result[0].valueScore).toBe('High Value');
  });

  it('returns 0 costPerPoint when agent has no points', () => {
    const agents = [makeAgent({ name: 'alice' })];
    const tasks: any[] = [];
    const costRecords = [makeCostRecord({ agentId: 'agent-1', costUSD: 10 })];
    const result = computeAgentEfficiency(agents, tasks, costRecords);
    expect(result[0].costPerPoint).toBe(0);
    expect(result[0].totalPoints).toBe(0);
  });

  it('only counts done tasks toward points', () => {
    const agents = [makeAgent({ name: 'alice' })];
    const tasks = [
      { assigneeId: 'agent-1', storyPoints: 5, status: 'done' },
      { assigneeId: 'agent-1', storyPoints: 3, status: 'in_progress' },
    ];
    const costRecords = [makeCostRecord({ agentId: 'agent-1', costUSD: 10 })];
    const result = computeAgentEfficiency(agents, tasks, costRecords);
    expect(result[0].totalPoints).toBe(5);
  });
});

// ─── computeROISummary ────────────────────────────────

describe('computeROISummary', () => {
  it('returns zeros for empty input', () => {
    const result = computeROISummary([], []);
    expect(result.avgCostPerPoint).toBe(0);
    expect(result.pointsPerDollar).toBe(0);
    expect(result.estimatedProjectCost).toBe(0);
  });

  it('calculates avgCostPerPoint across sprints', () => {
    const sprints = [
      makeSprint({ actualCost: 100, pointsDelivered: 20 }),
      makeSprint({ actualCost: 60, pointsDelivered: 10 }),
    ];
    const result = computeROISummary([], sprints);
    expect(result.avgCostPerPoint).toBeCloseTo(5.5);
  });

  it('calculates pointsPerDollar', () => {
    const sprints = [makeSprint({ actualCost: 100, pointsDelivered: 20 })];
    const result = computeROISummary([], sprints);
    expect(result.pointsPerDollar).toBeCloseTo(0.2);
  });

  it('returns 0 pointsPerDollar when total cost is 0', () => {
    const sprints = [makeSprint({ actualCost: 0, pointsDelivered: 10 })];
    const result = computeROISummary([], sprints);
    expect(result.pointsPerDollar).toBe(0);
  });

  it('calculates estimatedProjectCost', () => {
    const sprints = [
      makeSprint({ actualCost: 100, pointsDelivered: 20 }),
      makeSprint({ actualCost: 60, pointsDelivered: 10 }),
    ];
    const result = computeROISummary([], sprints);
    expect(result.estimatedProjectCost).toBeGreaterThan(0);
  });
});

// ─── computeOptimizations ─────────────────────────────

describe('computeOptimizations', () => {
  it('returns empty array for no agents', () => {
    expect(computeOptimizations([])).toEqual([]);
  });

  it('suggests switching expensive agents', () => {
    const agents: any[] = [
      { agentName: 'Alice', costPerPoint: 4.0, valueScore: 'Premium' },
      { agentName: 'Bob', costPerPoint: 1.5, valueScore: 'High Value' },
    ];
    const result = computeOptimizations(agents);
    expect(result.length).toBeGreaterThan(0);
    const opt = result.find(
      (o) =>
        o.title.includes('Alice') ||
        o.description.includes('Alice') ||
        o.title.toLowerCase().includes('model'),
    );
    expect(opt).toBeDefined();
  });

  it('ranks high priority first', () => {
    const agents: any[] = [
      { agentName: 'Alice', costPerPoint: 5.0, valueScore: 'Premium' },
      { agentName: 'Bob', costPerPoint: 4.0, valueScore: 'Premium' },
    ];
    const result = computeOptimizations(agents);
    if (result.length > 1) {
      expect(result[0].priority).toBe('high');
    }
  });

  it('includes potential savings', () => {
    const agents: any[] = [
      { agentName: 'Alice', costPerPoint: 5.0, valueScore: 'Premium' },
    ];
    const result = computeOptimizations(agents);
    expect(result[0].potentialSavings).toBeGreaterThan(0);
  });
});
