/**
 * Runtime contract for fleet catalog counter maintenance.
 *
 * These tests use registered Convex functions against the shared schema. They
 * intentionally cover the indexes that make each upsert idempotent, rather
 * than calling implementation handlers with an in-memory wrapper context.
 */

import { api } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';
import { describe, expect, it } from 'vitest';

type ConvexTest = ReturnType<typeof createConvexTest>;

type CounterKey =
  | 'count:tasks'
  | 'count:issues'
  | 'count:executionLogs'
  | 'count:workRuns';

async function readCounter(
  t: ConvexTest,
  key: CounterKey,
): Promise<Doc<'systemMetadata'> | null> {
  return t.run(async (ctx) =>
    ctx.db
      .query('systemMetadata')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique(),
  );
}

describe('fleetCatalog counter maintenance runtime contract', () => {
  it('rejects counter mutations without an authenticated identity', async () => {
    const t = createUnauthenticatedConvexTest();

    await expect(
      t.mutation(api.fleetCatalog.upsertTask, {
        projectSlug: 'unauthenticated-project',
        trackId: 'counter-track',
        taskKey: 'unauthenticated-task',
        title: 'Must not persist',
        status: 'ready',
        dependencies: [],
      }),
    ).rejects.toThrow('Authentication required');

    const tasks = await t.run((ctx) => ctx.db.query('tasks').collect());
    expect(tasks).toEqual([]);
  });

  it('runs registered mutations with the shared authenticated identity and records first inserts', async () => {
    const t = createConvexTest();

    const identity = await t.run((ctx) => ctx.auth.getUserIdentity());
    expect(identity).toMatchObject({
      tokenIdentifier: 'test-user',
      subject: 'test-user',
    });

    await t.mutation(api.fleetCatalog.upsertTask, {
      projectSlug: 'counter-project',
      trackId: 'counter-track',
      taskKey: 'counter-task',
      title: 'Count this task',
      status: 'ready',
      dependencies: [],
    });
    await t.mutation(api.fleetCatalog.upsertIssue, {
      projectSlug: 'counter-project',
      issueId: 'counter-issue',
      title: 'Count this issue',
      body: 'Counter runtime contract',
      status: 'open',
      openedAt: 1_000,
    });
    await t.mutation(api.fleetCatalog.upsertWorkRun, {
      projectSlug: 'counter-project',
      runId: 'counter-run',
      status: 'running',
      startedAt: 1_000,
    });

    expect(await readCounter(t, 'count:tasks')).toMatchObject({
      valueJson: '1',
    });
    expect(await readCounter(t, 'count:issues')).toMatchObject({
      valueJson: '1',
    });
    expect(await readCounter(t, 'count:workRuns')).toMatchObject({
      valueJson: '1',
    });

    const summary = await t.query(api.fleetCatalog.getBootstrapSummary, {});
    expect(summary).toMatchObject({
      projects: 1,
      tasks: 1,
      issues: 1,
      executionLogs: 0,
      workRuns: 1,
    });
  });

  it('uses real unique indexes to update existing rows without incrementing counters', async () => {
    const t = createConvexTest();

    await t.mutation(api.fleetCatalog.upsertTask, {
      projectSlug: 'idempotent-project',
      trackId: 'counter-track',
      taskKey: 'idempotent-task',
      title: 'Original title',
      status: 'ready',
      dependencies: [],
    });
    await t.mutation(api.fleetCatalog.upsertTask, {
      projectSlug: 'idempotent-project',
      trackId: 'counter-track',
      taskKey: 'idempotent-task',
      title: 'Updated title',
      status: 'in_progress',
      dependencies: [],
    });

    await t.mutation(api.fleetCatalog.upsertIssue, {
      projectSlug: 'idempotent-project',
      issueId: 'idempotent-issue',
      title: 'Original issue',
      body: 'First body',
      status: 'open',
      openedAt: 1_000,
    });
    await t.mutation(api.fleetCatalog.upsertIssue, {
      projectSlug: 'idempotent-project',
      issueId: 'idempotent-issue',
      title: 'Resolved issue',
      body: 'Updated body',
      status: 'resolved',
      openedAt: 1_000,
      resolvedAt: 2_000,
    });

    await t.mutation(api.fleetCatalog.upsertWorkRun, {
      projectSlug: 'idempotent-project',
      runId: 'idempotent-run',
      status: 'running',
      startedAt: 1_000,
    });
    await t.mutation(api.fleetCatalog.upsertWorkRun, {
      projectSlug: 'idempotent-project',
      runId: 'idempotent-run',
      status: 'succeeded',
      startedAt: 1_000,
      finishedAt: 2_000,
    });

    const persisted = await t.run(async (ctx) => {
      const [task, issue, workRun] = await Promise.all([
        ctx.db
          .query('tasks')
          .withIndex('by_task_key', (q) => q.eq('taskKey', 'idempotent-task'))
          .unique(),
        ctx.db
          .query('issues')
          .withIndex('by_issue_id', (q) => q.eq('issueId', 'idempotent-issue'))
          .unique(),
        ctx.db
          .query('workRuns')
          .withIndex('by_run_id', (q) => q.eq('runId', 'idempotent-run'))
          .unique(),
      ]);
      return { task, issue, workRun };
    });

    expect(persisted.task).toMatchObject({
      title: 'Updated title',
      status: 'in_progress',
    });
    expect(persisted.issue).toMatchObject({
      title: 'Resolved issue',
      status: 'resolved',
      resolvedAt: 2_000,
    });
    expect(persisted.workRun).toMatchObject({
      status: 'succeeded',
      finishedAt: 2_000,
    });

    expect(await readCounter(t, 'count:tasks')).toMatchObject({
      valueJson: '1',
    });
    expect(await readCounter(t, 'count:issues')).toMatchObject({
      valueJson: '1',
    });
    expect(await readCounter(t, 'count:workRuns')).toMatchObject({
      valueJson: '1',
    });
  });

  it('reads seeded denormalized counters through the registered bootstrap summary query', async () => {
    const t = createConvexTest();

    await t.run(async (ctx) => {
      await ctx.db.insert('systemMetadata', {
        key: 'count:executionLogs',
        valueJson: '17',
        updatedAt: 1_000,
      });
    });

    const summary = await t.query(api.fleetCatalog.getBootstrapSummary, {});
    expect(summary).toMatchObject({
      tasks: 0,
      issues: 0,
      executionLogs: 17,
      workRuns: 0,
    });
  });
});
