/**
 * Runtime contracts for bounded analytics, budget governance, and costs.
 *
 * This supplements `analytics.runtime.convex-test.ts` with its distinct
 * bounded/filter behavior; pure calculation coverage remains in `convex/lib`.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';

type ConvexTest = ReturnType<typeof createConvexTest>;

async function seedProject(t: ConvexTest, slug: string): Promise<Id<'projects'>> {
  return t.run((ctx) =>
    ctx.db.insert('projects', {
      name: slug,
      slug,
      description: `Runtime metric scenario ${slug}`,
      createdAt: 1_000,
      updatedAt: 1_000,
    }),
  );
}

async function seedTask(
  t: ConvexTest,
  projectId: Id<'projects'>,
  title: string,
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked',
  options: {
    actualCost?: number;
    assigneeId?: Id<'agents'>;
    sessionId?: string;
    sprintId?: Id<'sprints'>;
    storyPoints?: number;
    trackId?: string;
    updatedAt?: number;
  } = {},
): Promise<Id<'tasks'>> {
  return t.run((ctx) =>
    ctx.db.insert('tasks', {
      projectId,
      title,
      description: `Metric task ${title}`,
      storyPoints: options.storyPoints ?? 1,
      status,
      priority: 'medium',
      costEstimate: 10,
      actualCost: options.actualCost,
      assigneeId: options.assigneeId,
      sessionId: options.sessionId,
      sprintId: options.sprintId,
      projectSlug: 'metric-project',
      trackId: options.trackId ?? 'metric-track',
      createdAt: options.updatedAt ?? Date.now() - 1_000,
      updatedAt: options.updatedAt ?? Date.now() - 1_000,
    }),
  );
}

async function seedCostRecord(
  t: ConvexTest,
  values: {
    agentId: string;
    projectSlug: string;
    taskId: string;
    costUSD: number;
    inputTokens?: number;
    outputTokens?: number;
    sessionResumed?: boolean;
    sessionCostSaved?: number;
  },
): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert('costRecords', {
      agentId: values.agentId,
      projectSlug: values.projectSlug,
      taskId: values.taskId,
      model: 'gpt-4o',
      inputTokens: values.inputTokens ?? 1_000,
      outputTokens: values.outputTokens ?? 500,
      costUSD: values.costUSD,
      sessionResumed: values.sessionResumed ?? false,
      sessionCostSaved: values.sessionCostSaved ?? 0,
      recordedAt: Date.now() - 1_000,
    }),
  );
}

describe('metrics runtime access contract', () => {
  it('rejects analytics, budget, and cost API calls without an identity', async () => {
    const t = createUnauthenticatedConvexTest();

    await expect(t.query(api.analytics.getSessionMetrics, { days: 1 })).rejects.toThrow(
      'Authentication required',
    );
    await expect(t.query(api.budgets.listBudgets, {})).rejects.toThrow(
      'Authentication required',
    );
    await expect(
      t.mutation(api.costs.recordCost, {
        agentId: 'anonymous',
        projectSlug: 'anonymous-project',
        taskId: 'anonymous-task',
        model: 'gpt-4o',
        inputTokens: 1,
        outputTokens: 1,
        sessionResumed: false,
      }),
    ).rejects.toThrow('Authentication required');
  });
});

describe('analytics bounded runtime contracts', () => {
  it('applies live session/agent filters without fabricating session buckets', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'metric-project');
    const agentId = await t.run((ctx) =>
      ctx.db.insert('agents', {
        name: 'metric-agent',
        role: 'executor',
        skills: ['typescript'],
        model: 'claude-sonnet',
        costPerPoint: 2,
        reliability: 0.9,
        status: 'active',
        workload: 0,
        maxWorkload: 5,
        createdAt: Date.now(),
      }),
    );
    await seedTask(t, projectId, 'Filtered #priority:high', 'done', {
      assigneeId: agentId,
      sessionId: 'session-1',
    });
    await seedTask(t, projectId, 'Other task #priority:low', 'ready');

    await expect(
      t.query(api.analytics.getCompletionTrends, {
        days: 1,
        agent: agentId,
        priority: 'high',
      }),
    ).resolves.toContainEqual(
      expect.objectContaining({ completed: 1, created: 1 }),
    );
    await expect(
      t.query(api.analytics.getSessionMetrics, { days: 1, agent: agentId }),
    ).resolves.toMatchObject({
      totalTasks: 1,
      sessionBoundTasks: 1,
      activeSessions: 0,
      byDate: [expect.objectContaining({ resumedSessions: 0 })],
    });
  });

  it('bounds task analytics to 1,000 indexed records across completion, queue, and bottleneck views', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'bounded-metric-project');
    const now = Date.now() - 1_000;
    await t.run(async (ctx) => {
      for (let index = 0; index < 1_001; index += 1) {
        await ctx.db.insert('tasks', {
          projectId,
          title: `Bounded task ${index}`,
          description: 'Bounded analytics row',
          storyPoints: 1,
          status: index % 3 === 0 ? 'done' : index % 3 === 1 ? 'blocked' : 'backlog',
          priority: 'medium',
          costEstimate: 0,
          projectSlug: 'bounded-metric-project',
          trackId: `track-${index % 2}`,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    const [completion, queue, bottlenecks] = await Promise.all([
      t.query(api.analytics.getCompletionTrends, { days: 1 }),
      t.query(api.analytics.getQueueDepth, { days: 1 }),
      t.query(api.analytics.getBottlenecks, { days: 1 }),
    ]);
    expect(completion.reduce((sum, day) => sum + day.created, 0)).toBe(1_000);
    expect(
      queue.reduce((sum, day) => sum + day.pending + day.inProgress + day.completed, 0),
    ).toBeLessThanOrEqual(1_000);
    expect(bottlenecks.reduce((sum, entry) => sum + entry.totalTasks, 0)).toBe(1_000);
  });
});

describe('budget governance runtime contracts', () => {
  it('settles reservations and records only threshold-crossing warning and breach events', async () => {
    const t = createConvexTest();
    const now = Date.now();
    await t.mutation(api.budgets.upsertBudget, {
      scope: 'project:warning',
      periodStart: now - 1_000,
      periodEnd: now + 1_000,
      cap: 100,
      spent: 70,
      policy: 'advisory',
    });
    await t.mutation(api.budgets.reserveBudget, {
      scope: 'project:warning',
      amount: 20,
      correlationId: 'warning-reservation',
    });
    await t.mutation(api.budgets.reconcileBudgetReservation, {
      scope: 'project:warning',
      correlationId: 'warning-reservation',
      actualCost: 15,
    });
    await expect(t.query(api.budgets.getBudget, { scope: 'project:warning' })).resolves.toMatchObject({
      spent: 85,
    });
    await expect(
      t.query(api.budgets.getGovernanceEvents, {
        scope: 'project:warning',
        eventType: 'budget_warning',
      }),
    ).resolves.toHaveLength(1);

    await t.mutation(api.budgets.upsertBudget, {
      scope: 'project:breach',
      periodStart: now - 1_000,
      periodEnd: now + 1_000,
      cap: 100,
      spent: 95,
      policy: 'advisory',
    });
    await t.mutation(api.budgets.reserveBudget, {
      scope: 'project:breach',
      amount: 10,
      correlationId: 'breach-reservation',
    });
    await t.mutation(api.budgets.reconcileBudgetReservation, {
      scope: 'project:breach',
      correlationId: 'breach-reservation',
      actualCost: 10,
    });
    await expect(
      t.query(api.budgets.getGovernanceEvents, {
        scope: 'project:breach',
        eventType: 'budget_breach',
      }),
    ).resolves.toHaveLength(1);
    await expect(
      t.query(api.budgets.getGovernanceEvents, {
        scope: 'project:breach',
        eventType: 'budget_warning',
      }),
    ).resolves.toEqual([]);
  });
});

describe('cost runtime contracts', () => {
  it('records session savings without double-counting budget spend and aggregates real indexes', async () => {
    const t = createConvexTest();
    const now = Date.now();
    await t.mutation(api.budgets.upsertBudget, {
      scope: 'project:cost-project',
      periodStart: now - 1_000,
      periodEnd: now + 1_000,
      cap: 1_000,
      spent: 100,
      policy: 'advisory',
    });
    const recorded = await t.mutation(api.costs.recordCost, {
      agentId: 'cost-agent',
      projectSlug: 'cost-project',
      taskId: 'recorded-task',
      model: 'gpt-4o',
      inputTokens: 1_000,
      outputTokens: 500,
      sessionResumed: true,
      contextTokens: 1_000_000,
    });
    expect(recorded.costUSD).toBeGreaterThan(0);
    expect(recorded.sessionCostSaved).toBeGreaterThan(0);
    await expect(t.query(api.budgets.getBudget, { scope: 'project:cost-project' })).resolves.toMatchObject({
      spent: 100,
    });

    const projectId = await seedProject(t, 'cost-project');
    const completedA = await seedTask(t, projectId, 'Costed A', 'done');
    const completedB = await seedTask(t, projectId, 'Costed B', 'done');
    await seedCostRecord(t, {
      agentId: 'agent-a',
      projectSlug: 'cost-project',
      taskId: completedA,
      costUSD: 10,
      sessionResumed: true,
      sessionCostSaved: 5,
    });
    await seedCostRecord(t, {
      agentId: 'agent-a',
      projectSlug: 'cost-project',
      taskId: completedB,
      costUSD: 20,
      sessionResumed: true,
      sessionCostSaved: 3,
    });
    await seedCostRecord(t, {
      agentId: 'agent-b',
      projectSlug: 'other-project',
      taskId: 'other-task',
      costUSD: 30,
    });

    await expect(
      t.query(api.costs.getCostByProject, { days: 1, projectSlug: 'cost-project' }),
    ).resolves.toEqual([
      expect.objectContaining({ projectSlug: 'cost-project', totalCostUSD: expect.any(Number) }),
    ]);
    await expect(
      t.query(api.costs.getCostByAgent, { days: 1, projectSlug: 'cost-project' }),
    ).resolves.toContainEqual(expect.objectContaining({ agentId: 'agent-a', totalCostUSD: 30 }));
    await expect(t.query(api.costs.getCostTrend, { days: 2, projectSlug: 'cost-project' })).resolves.toHaveLength(2);
    await expect(
      t.query(api.costs.getSessionSavings, { days: 1, projectSlug: 'cost-project' }),
    ).resolves.toMatchObject({ totalSavedUSD: expect.any(Number), totalResumedSessions: 3 });
    await expect(
      t.query(api.costs.getCostPerTask, { days: 1, projectSlug: 'cost-project' }),
    ).resolves.toMatchObject({ completedTasks: 2, costPerTask: expect.any(Number) });
  });

  it('backfills only token-bearing run contracts that have no cost record', async () => {
    const t = createConvexTest();
    await t.run(async (ctx) => {
      await ctx.db.insert('runContracts', {
        taskId: 'backfill-new',
        projectSlug: 'backfill-project',
        objective: 'Backfill cost',
        scope: ['convex'],
        acceptanceCriteria: ['cost record created'],
        createdAt: Date.now(),
        inputTokens: 1_000,
        outputTokens: 500,
      });
      await ctx.db.insert('runContracts', {
        taskId: 'backfill-empty',
        projectSlug: 'backfill-project',
        objective: 'Skip empty',
        scope: ['convex'],
        acceptanceCriteria: ['skip'],
        createdAt: Date.now(),
      });
      await ctx.db.insert('costRecords', {
        agentId: 'existing',
        projectSlug: 'backfill-project',
        taskId: 'backfill-existing',
        model: 'gpt-4o',
        inputTokens: 1,
        outputTokens: 1,
        costUSD: 1,
        sessionResumed: false,
        sessionCostSaved: 0,
        recordedAt: Date.now(),
      });
      await ctx.db.insert('runContracts', {
        taskId: 'backfill-existing',
        projectSlug: 'backfill-project',
        objective: 'Skip duplicate',
        scope: ['convex'],
        acceptanceCriteria: ['skip'],
        createdAt: Date.now(),
        inputTokens: 1_000,
      });
    });

    await expect(
      t.mutation(api.costs.backfillCostRecords, { projectSlug: 'backfill-project' }),
    ).resolves.toEqual({ scanned: 3, created: 1, skipped: 2 });
  });
});
