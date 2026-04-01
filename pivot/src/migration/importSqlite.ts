import { Database } from 'bun:sqlite';
import { createConvexClient } from '../convexClient';

type ImportStats = {
  projects: number;
  tracks: number;
  tasks: number;
  issues: number;
  executionLogs: number;
};

function toTrackStatus(status: string) {
  switch (status) {
    case 'active':
    case 'blocked':
    case 'archived':
      return status;
    case 'done':
    case 'complete':
      return 'complete';
    default:
      return 'new';
  }
}

function toTaskStatus(status: string) {
  switch (status) {
    case 'ready':
    case 'in_progress':
    case 'blocked':
    case 'done':
      return status;
    default:
      return 'todo';
  }
}

function toIssueStatus(status: string) {
  switch (status) {
    case 'triaged':
    case 'resolved':
    case 'closed':
      return status;
    default:
      return 'open';
  }
}

function toRunStatus(status: string) {
  switch (status) {
    case 'queued':
    case 'running':
    case 'succeeded':
    case 'failed':
    case 'cancelled':
      return status;
    case 'success':
      return 'succeeded';
    default:
      return 'failed';
  }
}

function readRows<T>(db: Database, sql: string): T[] {
  return db.query(sql).all() as T[];
}

export async function importFromSQLite(sqlitePath: string): Promise<ImportStats> {
  const db = new Database(sqlitePath, { readonly: true });
  const client = createConvexClient();
  const stats: ImportStats = {
    projects: 0,
    tracks: 0,
    tasks: 0,
    issues: 0,
    executionLogs: 0,
  };

  const projects = readRows<{ id: string; name: string; path: string }>(
    db,
    'SELECT id, name, path FROM projects',
  );
  for (const row of projects) {
    await client.mutation('projects:upsertProject' as never, {
      slug: row.id,
      name: row.name,
      rootPath: row.path,
      status: 'active',
      source: 'import',
    } as never);
    stats.projects += 1;
  }

  const tracks = readRows<{
    id: string;
    project_id: string;
    name: string;
    status: string;
  }>(db, 'SELECT id, project_id, name, status FROM tracks');
  for (const row of tracks) {
    await client.mutation('tracks:upsertTrackSnapshot' as never, {
      projectSlug: row.project_id,
      trackId: row.id,
      title: row.name,
      status: toTrackStatus(row.status),
      specMarkdown: '',
      planMarkdown: '',
    } as never);
    stats.tracks += 1;
  }

  const tasks = readRows<{
    id: string;
    track_id: string;
    description: string;
    status: string;
    agent_tag: string | null;
  }>(db, 'SELECT id, track_id, description, status, agent_tag FROM tasks');
  for (const row of tasks) {
    await client.mutation('fleetCatalog:upsertTask' as never, {
      projectSlug: row.track_id.split('/')[0] ?? 'unknown-project',
      trackId: row.track_id,
      taskKey: row.id,
      title: row.description,
      status: toTaskStatus(row.status),
      assignee: row.agent_tag ?? undefined,
      dependencies: [],
    } as never);
    stats.tasks += 1;
  }

  const issues = readRows<{
    id: string;
    project_id: string;
    title: string;
    description: string;
    status: string;
    created_at: number | null;
    updated_at: number | null;
  }>(
    db,
    'SELECT id, project_id, title, description, status, created_at, updated_at FROM issues',
  );
  for (const row of issues) {
    const openedAt = row.created_at ?? Date.now();
    await client.mutation('fleetCatalog:upsertIssue' as never, {
      projectSlug: row.project_id,
      issueId: row.id,
      title: row.title,
      body: row.description,
      status: toIssueStatus(row.status),
      openedAt,
      resolvedAt: row.status === 'resolved' ? row.updated_at ?? Date.now() : undefined,
    } as never);
    stats.issues += 1;
  }

  const logs = readRows<{
    project_id: string;
    task_id: string | null;
    status: string;
    output: string | null;
    timestamp: number | null;
  }>(
    db,
    'SELECT project_id, task_id, status, output, timestamp FROM execution_logs ORDER BY timestamp ASC',
  );
  for (const [index, row] of logs.entries()) {
    await client.mutation('executionLogs:appendLog' as never, {
      projectSlug: row.project_id,
      runId: `sqlite-import-${index}`,
      trackId: row.task_id ?? undefined,
      status: toRunStatus(row.status),
      summary: `Imported legacy log (${row.status})`,
      rawOutput: row.output ?? undefined,
    } as never);
    stats.executionLogs += 1;
  }

  db.close();
  return stats;
}

async function main() {
  const [, , sqlitePath] = process.argv;
  if (!sqlitePath) {
    throw new Error('Usage: bun src/migration/importSqlite.ts <sqlitePath>');
  }
  const stats = await importFromSQLite(sqlitePath);
  console.log(JSON.stringify(stats, null, 2));
}

await main();
