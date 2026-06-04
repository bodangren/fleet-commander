import { describe, expect, it } from 'bun:test';
import {
  normalizeMetric,
  calculateAgentScore,
  rankAgents,
  aggregateAgentMetrics,
  computeBounds,
  DEFAULT_SCORE_WEIGHTS,
  type AgentMetrics,
  type AgentScore,
} from './leaderboard';
import type { Doc } from '../_generated/dataModel';

function makeAgent(overrides: Partial<Doc<'agents'>> = {}): Doc<'agents'> {
  return {
    _id: `agent-${Math.random().toString(36).slice(2, 8)}` as Doc<'agents'>['_id'],
    _creationTime: Date.now(),
    name: 'Test Agent',
    role: 'executor' as const,
    skills: ['typescript'],
    model: 'claude-sonnet',
    costPerPoint: 2,
    reliability: 0.9,
    status: 'active' as const,
    workload: 1,
    maxWorkload: 3,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeTask(overrides: Partial<Doc<'tasks'>> = {}): Doc<'tasks'> {
  return {
    _id: `task-${Math.random().toString(36).slice(2, 8)}` as Doc<'tasks'>['_id'],
    _creationTime: Date.now(),
    projectId: 'proj-1' as Doc<'projects'>['_id'],
    title: 'Test task',
    description: 'A test task',
    storyPoints: 3,
    status: 'done' as const,
    priority: 'medium' as const,
    costEstimate: 6,
    assigneeId: 'agent-1' as Doc<'agents'>['_id'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeCostRecord(overrides: Partial<Doc<'costRecords'>> = {}): Doc<'costRecords'> {
  return {
    _id: `cr-${Math.random().toString(36).slice(2, 8)}` as Doc<'costRecords'>['_id'],
    _creationTime: Date.now(),
    agentId: 'agent-1',
    projectSlug: 'test-project',
    taskId: 'task-1',
    model: 'claude-sonnet',
    inputTokens: 1000,
    outputTokens: 500,
    costUSD: 3,
    sessionResumed: false,
    sessionCostSaved: 0,
    recordedAt: Date.now(),
    ...overrides,
  };
}

function makeSprint(overrides: Partial<Doc<'sprints'>> = {}): Doc<'sprints'> {
  return {
    _id: `sprint-${Math.random().toString(36).slice(2, 8)}` as Doc<'sprints'>['_id'],
    _creationTime: Date.now(),
    projectId: 'proj-1' as Doc<'projects'>['_id'],
    name: 'Sprint 1',
    status: 'closed' as const,
    budget: 100,
    actualCost: 80,
    pointsDelivered: 40,
    taskCount: 10,
    completedCount: 8,
    createdAt: Date.now(),
    startedAt: Date.now() - 7 * 86_400_000,
    closedAt: Date.now(),
    ...overrides,
  };
}

function makeMetrics(overrides: Partial<AgentMetrics> = {}): AgentMetrics {
  return {
    agentId: 'agent-1',
    agentName: 'Alice',
    role: 'executor',
    model: 'claude-sonnet',
    costPerPoint: 2,
    rejectionRate: 0.1,
    throughput: 3,
    mergeRate: 0.9,
    ...overrides,
  };
}

describe('normalizeMetric', () => {
  it('returns 1 when value equals min and lower is better', () => {
    expect(normalizeMetric(0, 0, 10, false)).toBe(1);
  });

  it('returns 0 when value equals max and lower is better', () => {
    expect(normalizeMetric(10, 0, 10, false)).toBe(0);
  });

  it('returns 0.5 for midpoint', () => {
    expect(normalizeMetric(5, 0, 10, false)).toBe(0.5);
  });

  it('returns 1 when min equals max (no range)', () => {
    expect(normalizeMetric(5, 5, 5, false)).toBe(1);
  });

  it('clamps to 0 when value exceeds max (lower is better)', () => {
    expect(normalizeMetric(15, 0, 10, false)).toBe(0);
  });

  it('clamps to 1 when value is below min (lower is better)', () => {
    expect(normalizeMetric(-5, 0, 10, false)).toBe(1);
  });

  it('returns 1 when value equals max and higher is better', () => {
    expect(normalizeMetric(20, 0, 20, true)).toBe(1);
  });

  it('returns 0 when value equals min and higher is better', () => {
    expect(normalizeMetric(0, 0, 20, true)).toBe(0);
  });

  it('defaults to lower-is-better when not specified', () => {
    expect(normalizeMetric(0, 0, 10)).toBe(1);
    expect(normalizeMetric(10, 0, 10)).toBe(0);
  });
});

describe('calculateAgentScore', () => {
  it('produces a score between 0 and 1', () => {
    const metrics = makeMetrics();
    const score = calculateAgentScore(metrics);
    expect(score.compositeScore).toBeGreaterThanOrEqual(0);
    expect(score.compositeScore).toBeLessThanOrEqual(1);
  });

  it('gives perfect score when all metrics are at best bounds', () => {
    const metrics = makeMetrics({
      costPerPoint: 0,
      rejectionRate: 0,
      throughput: 20,
      mergeRate: 1,
    });
    const bounds = {
      costPerPoint: { min: 0, max: 10 },
      rejectionRate: { min: 0, max: 1 },
      throughput: { min: 0, max: 20 },
      mergeRate: { min: 0, max: 1 },
    };
    const score = calculateAgentScore(metrics, DEFAULT_SCORE_WEIGHTS, bounds);
    expect(score.compositeScore).toBeCloseTo(1, 2);
  });

  it('gives zero score when all metrics are at worst bounds', () => {
    const metrics = makeMetrics({
      costPerPoint: 10,
      rejectionRate: 1,
      throughput: 0,
      mergeRate: 0,
    });
    const bounds = {
      costPerPoint: { min: 0, max: 10 },
      rejectionRate: { min: 0, max: 1 },
      throughput: { min: 0, max: 20 },
      mergeRate: { min: 0, max: 1 },
    };
    const score = calculateAgentScore(metrics, DEFAULT_SCORE_WEIGHTS, bounds);
    expect(score.compositeScore).toBeCloseTo(0, 2);
  });

  it('respects custom weights', () => {
    const metrics = makeMetrics({
      costPerPoint: 0,
      rejectionRate: 1,
      throughput: 0,
      mergeRate: 0,
    });

    const costOnlyWeights = {
      costPerPoint: 1,
      rejectionRate: 0,
      throughput: 0,
      mergeRate: 0,
    };
    const scoreCostOnly = calculateAgentScore(metrics, costOnlyWeights);

    const rejectionOnlyWeights = {
      costPerPoint: 0,
      rejectionRate: 1,
      throughput: 0,
      mergeRate: 0,
    };
    const scoreRejectionOnly = calculateAgentScore(metrics, rejectionOnlyWeights);

    expect(scoreCostOnly.compositeScore).toBeGreaterThan(scoreRejectionOnly.compositeScore);
  });

  it('defaults to DEFAULT_SCORE_WEIGHTS when no weights provided', () => {
    const metrics = makeMetrics();
    const withDefaults = calculateAgentScore(metrics);
    const withExplicit = calculateAgentScore(metrics, DEFAULT_SCORE_WEIGHTS);
    expect(withDefaults.compositeScore).toBe(withExplicit.compositeScore);
  });

  it('preserves agent metadata in result', () => {
    const metrics = makeMetrics({
      agentId: 'agent-42',
      agentName: 'Bob',
      role: 'reviewer',
      model: 'gpt-4o',
    });
    const score = calculateAgentScore(metrics);
    expect(score.agentId).toBe('agent-42');
    expect(score.agentName).toBe('Bob');
    expect(score.role).toBe('reviewer');
    expect(score.model).toBe('gpt-4o');
  });

  it('computes breakdown correctly', () => {
    const metrics = makeMetrics({
      costPerPoint: 2,
      rejectionRate: 0.2,
      throughput: 10,
      mergeRate: 0.8,
    });
    const bounds = {
      costPerPoint: { min: 0, max: 10 },
      rejectionRate: { min: 0, max: 1 },
      throughput: { min: 0, max: 20 },
      mergeRate: { min: 0, max: 1 },
    };
    const score = calculateAgentScore(metrics, DEFAULT_SCORE_WEIGHTS, bounds);

    expect(score.breakdown.costPerPoint).toBeCloseTo(0.8, 2);
    expect(score.breakdown.rejectionRate).toBeCloseTo(0.8, 2);
    expect(score.breakdown.throughput).toBeCloseTo(0.5, 2);
    expect(score.breakdown.mergeRate).toBeCloseTo(0.8, 2);
  });

  it('handles zero throughput without division errors', () => {
    const metrics = makeMetrics({ throughput: 0 });
    const score = calculateAgentScore(metrics);
    expect(Number.isFinite(score.compositeScore)).toBe(true);
  });
});

describe('rankAgents', () => {
  it('ranks agents by composite score descending', () => {
    const current: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1', compositeScore: 0 })), compositeScore: 0.3 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a2' })), compositeScore: 0.8 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a3' })), compositeScore: 0.6 },
    ];
    // Override compositeScore directly for ranking test
    current[0].compositeScore = 0.3;
    current[1].compositeScore = 0.8;
    current[2].compositeScore = 0.6;

    const ranked = rankAgents(current, []);

    expect(ranked[0].agentId).toBe('a2');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].agentId).toBe('a3');
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].agentId).toBe('a1');
    expect(ranked[2].rank).toBe(3);
  });

  it('computes trend up when agent improved rank', () => {
    const previous: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1' })), compositeScore: 0.8 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a2' })), compositeScore: 0.6 },
    ];
    previous[0].compositeScore = 0.8;
    previous[1].compositeScore = 0.6;

    const current: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a2' })), compositeScore: 0.9 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1' })), compositeScore: 0.7 },
    ];
    current[0].compositeScore = 0.9;
    current[1].compositeScore = 0.7;

    const ranked = rankAgents(current, previous);

    expect(ranked[0].agentId).toBe('a2');
    expect(ranked[0].trend).toBe('up');
    expect(ranked[0].previousRank).toBe(2);
  });

  it('computes trend down when agent lost rank', () => {
    const previous: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1' })), compositeScore: 0.9 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a2' })), compositeScore: 0.6 },
    ];
    previous[0].compositeScore = 0.9;
    previous[1].compositeScore = 0.6;

    const current: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a2' })), compositeScore: 0.8 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1' })), compositeScore: 0.7 },
    ];
    current[0].compositeScore = 0.8;
    current[1].compositeScore = 0.7;

    const ranked = rankAgents(current, previous);

    expect(ranked[1].agentId).toBe('a1');
    expect(ranked[1].trend).toBe('down');
  });

  it('computes flat trend for new agents', () => {
    const current: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1' })), compositeScore: 0.8 },
    ];
    current[0].compositeScore = 0.8;

    const ranked = rankAgents(current, []);

    expect(ranked[0].trend).toBe('flat');
    expect(ranked[0].previousRank).toBeNull();
  });

  it('assigns top_performer badge to rank 1', () => {
    const current: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1' })), compositeScore: 0.9 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a2' })), compositeScore: 0.5 },
    ];
    current[0].compositeScore = 0.9;
    current[1].compositeScore = 0.5;

    const ranked = rankAgents(current, []);

    expect(ranked[0].badges).toContain('top_performer');
    expect(ranked[1].badges).not.toContain('top_performer');
  });

  it('assigns most_efficient badge to agent with lowest costPerPoint', () => {
    const current: AgentScore[] = [
      {
        ...calculateAgentScore(makeMetrics({ agentId: 'a1', costPerPoint: 5 })),
        compositeScore: 0.9,
        metrics: makeMetrics({ agentId: 'a1', costPerPoint: 5 }),
      },
      {
        ...calculateAgentScore(makeMetrics({ agentId: 'a2', costPerPoint: 1 })),
        compositeScore: 0.5,
        metrics: makeMetrics({ agentId: 'a2', costPerPoint: 1 }),
      },
    ];
    current[0].compositeScore = 0.9;
    current[1].compositeScore = 0.5;

    const ranked = rankAgents(current, []);

    const efficientAgent = ranked.find((r) => r.badges.includes('most_efficient'));
    expect(efficientAgent?.agentId).toBe('a2');
  });

  it('assigns most_improved badge to agent with biggest rank improvement', () => {
    const previous: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1' })), compositeScore: 0.9 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a2' })), compositeScore: 0.7 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a3' })), compositeScore: 0.5 },
    ];
    previous[0].compositeScore = 0.9;
    previous[1].compositeScore = 0.7;
    previous[2].compositeScore = 0.5;

    const current: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a3' })), compositeScore: 0.95 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1' })), compositeScore: 0.8 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a2' })), compositeScore: 0.6 },
    ];
    current[0].compositeScore = 0.95;
    current[1].compositeScore = 0.8;
    current[2].compositeScore = 0.6;

    const ranked = rankAgents(current, previous);

    const improvedAgent = ranked.find((r) => r.badges.includes('most_improved'));
    expect(improvedAgent?.agentId).toBe('a3');
  });

  it('does not assign most_improved badge when no agent has previous rank', () => {
    const current: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1' })), compositeScore: 0.9 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a2' })), compositeScore: 0.5 },
    ];
    current[0].compositeScore = 0.9;
    current[1].compositeScore = 0.5;

    const ranked = rankAgents(current, []);

    const improvedAgent = ranked.find((r) => r.badges.includes('most_improved'));
    expect(improvedAgent).toBeUndefined();
  });

  it('handles empty arrays', () => {
    const ranked = rankAgents([], []);
    expect(ranked).toEqual([]);
  });

  it('handles tie-breaking by maintaining stable sort', () => {
    const current: AgentScore[] = [
      { ...calculateAgentScore(makeMetrics({ agentId: 'a1' })), compositeScore: 0.5 },
      { ...calculateAgentScore(makeMetrics({ agentId: 'a2' })), compositeScore: 0.5 },
    ];
    current[0].compositeScore = 0.5;
    current[1].compositeScore = 0.5;

    const ranked = rankAgents(current, []);

    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked.length).toBe(2);
  });
});

describe('aggregateAgentMetrics', () => {
  it('aggregates cost per point correctly', () => {
    const agents = [makeAgent({ _id: 'a1' as Doc<'agents'>['_id'], name: 'Alice' })];
    const tasks = [
      makeTask({
        assigneeId: 'a1' as Doc<'agents'>['_id'],
        storyPoints: 5,
        status: 'done',
      }),
    ];
    const costRecords = [
      makeCostRecord({ agentId: 'a1', costUSD: 10 }),
    ];
    const sprints = [makeSprint()];

    const metrics = aggregateAgentMetrics(agents, tasks, costRecords, sprints, 7);

    expect(metrics.length).toBe(1);
    expect(metrics[0].costPerPoint).toBe(2);
  });

  it('computes rejection rate correctly', () => {
    const agents = [makeAgent({ _id: 'a1' as Doc<'agents'>['_id'] })];
    const tasks = [
      makeTask({ assigneeId: 'a1' as Doc<'agents'>['_id'], status: 'done' }),
      makeTask({
        assigneeId: 'a1' as Doc<'agents'>['_id'],
        status: 'ready',
        rejectionReason: 'quality',
        _id: 'task-2' as Doc<'tasks'>['_id'],
      }),
    ];
    const sprints = [makeSprint()];

    const metrics = aggregateAgentMetrics(agents, tasks, [], sprints, 7);

    expect(metrics[0].rejectionRate).toBe(0.5);
  });

  it('computes throughput as tasks per day', () => {
    const agents = [makeAgent({ _id: 'a1' as Doc<'agents'>['_id'] })];
    const tasks = [
      makeTask({ assigneeId: 'a1' as Doc<'agents'>['_id'], status: 'done' }),
      makeTask({
        assigneeId: 'a1' as Doc<'agents'>['_id'],
        status: 'done',
        _id: 'task-2' as Doc<'tasks'>['_id'],
      }),
    ];
    const sprints = [
      makeSprint({
        startedAt: Date.now() - 7 * 86_400_000,
        closedAt: Date.now(),
      }),
    ];

    const metrics = aggregateAgentMetrics(agents, tasks, [], sprints, 7);

    expect(metrics[0].throughput).toBeCloseTo(2 / 7, 1);
  });

  it('computes merge rate correctly', () => {
    const agents = [makeAgent({ _id: 'a1' as Doc<'agents'>['_id'] })];
    const tasks = [
      makeTask({
        assigneeId: 'a1' as Doc<'agents'>['_id'],
        status: 'done',
        mergerId: 'a1' as Doc<'agents'>['_id'],
      }),
      makeTask({
        assigneeId: 'a1' as Doc<'agents'>['_id'],
        status: 'done',
        _id: 'task-2' as Doc<'tasks'>['_id'],
      }),
    ];
    const sprints = [makeSprint()];

    const metrics = aggregateAgentMetrics(agents, tasks, [], sprints, 7);

    expect(metrics[0].mergeRate).toBe(0.5);
  });

  it('filters out agents with no activity', () => {
    const agents = [
      makeAgent({ _id: 'a1' as Doc<'agents'>['_id'], name: 'Active' }),
      makeAgent({ _id: 'a2' as Doc<'agents'>['_id'], name: 'Idle' }),
    ];
    const tasks = [
      makeTask({ assigneeId: 'a1' as Doc<'agents'>['_id'], status: 'done' }),
    ];
    const sprints = [makeSprint()];

    const metrics = aggregateAgentMetrics(agents, tasks, [], sprints, 7);

    expect(metrics.length).toBe(1);
    expect(metrics[0].agentName).toBe('Active');
  });

  it('handles empty inputs gracefully', () => {
    const metrics = aggregateAgentMetrics([], [], [], [], 7);
    expect(metrics).toEqual([]);
  });
});

describe('computeBounds', () => {
  it('computes min/max from metrics', () => {
    const metrics: AgentMetrics[] = [
      makeMetrics({ costPerPoint: 1, rejectionRate: 0.1, throughput: 5, mergeRate: 0.8 }),
      makeMetrics({ costPerPoint: 5, rejectionRate: 0.5, throughput: 10, mergeRate: 0.4 }),
    ];

    const bounds = computeBounds(metrics);

    expect(bounds.costPerPoint).toEqual({ min: 1, max: 5 });
    expect(bounds.rejectionRate).toEqual({ min: 0.1, max: 0.5 });
    expect(bounds.throughput).toEqual({ min: 5, max: 10 });
    expect(bounds.mergeRate).toEqual({ min: 0.4, max: 0.8 });
  });

  it('returns default bounds for empty metrics', () => {
    const bounds = computeBounds([]);

    expect(bounds.costPerPoint.min).toBe(0);
    expect(bounds.costPerPoint.max).toBe(10);
    expect(bounds.rejectionRate.min).toBe(0);
    expect(bounds.rejectionRate.max).toBe(1);
  });

  it('handles single metric entry', () => {
    const metrics = [makeMetrics({ costPerPoint: 3, rejectionRate: 0.2, throughput: 7, mergeRate: 0.6 })];
    const bounds = computeBounds(metrics);

    expect(bounds.costPerPoint).toEqual({ min: 3, max: 3 });
  });
});
