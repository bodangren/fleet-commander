import { appendFileSync, mkdirSync, readFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

const WAL_DIR = join(homedir(), '.measure-fleet', 'wal');

export interface WalEntry {
  id: string;
  type: 'mutation';
  target: string;
  args: Record<string, unknown>;
  timestamp: number;
  committed: boolean;
}

// Maps WAL target names to actual Convex API references
const TARGET_MAP: Record<string, (client: ConvexHttpClient, args: Record<string, unknown>) => Promise<unknown>> = {
  'executionLogs.appendLog': (client, args) =>
    client.mutation(api.executionLogs.appendLog, args as Parameters<typeof api.executionLogs.appendLog._args>[0]),
  'fleetCatalog.upsertWorkRun': (client, args) =>
    client.mutation(api.fleetCatalog.upsertWorkRun, args as Parameters<typeof api.fleetCatalog.upsertWorkRun._args>[0]),
  'fleetCatalog.upsertTask': (client, args) =>
    client.mutation(api.fleetCatalog.upsertTask, args as Parameters<typeof api.fleetCatalog.upsertTask._args>[0]),
};

export interface WalEntry {
  id: string;
  type: 'mutation';
  target: string;
  args: Record<string, unknown>;
  timestamp: number;
  committed: boolean;
}

function walPath(date: Date): string {
  const iso = date.toISOString().slice(0, 10);
  return join(WAL_DIR, `${iso}.jsonl`);
}

function todayPath(): string {
  return walPath(new Date());
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function append(entry: Omit<WalEntry, 'id' | 'committed'> & { id?: string }): WalEntry {
  mkdirSync(WAL_DIR, { recursive: true });
  const full: WalEntry = {
    id: entry.id ?? generateId(),
    type: entry.type,
    target: entry.target,
    args: entry.args,
    timestamp: entry.timestamp,
    committed: false,
  };
  appendFileSync(todayPath(), JSON.stringify(full) + '\n', 'utf8');
  return full;
}

export function markCommitted(entryId: string): void {
  // Append a commit marker line so replay can skip this entry
  const marker: WalEntry = {
    id: entryId,
    type: 'mutation',
    target: '__wal_commit__',
    args: {},
    timestamp: Date.now(),
    committed: true,
  };
  appendFileSync(todayPath(), JSON.stringify(marker) + '\n', 'utf8');
}

function readEntries(filePath: string): WalEntry[] {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf8');
  const entries: WalEntry[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip corrupt lines
    }
  }
  return entries;
}

export function getUncommittedEntries(): WalEntry[] {
  const entries = readEntries(todayPath());
  const committed = new Set<string>();
  const uncommitted: WalEntry[] = [];

  for (const entry of entries) {
    if (entry.committed) {
      committed.add(entry.id);
    } else if (entry.target !== '__wal_commit__') {
      uncommitted.push(entry);
    }
  }

  return uncommitted.filter((e) => !committed.has(e.id));
}

export function clear(): void {
  const path = todayPath();
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

export function getWalDir(): string {
  return WAL_DIR;
}

/**
 * Replays uncommitted WAL entries to Convex in order.
 * Skips entries whose target has no handler (unknown mutations).
 * Returns the number of entries replayed and the number skipped.
 */
export async function replay(client: ConvexHttpClient): Promise<{ replayed: number; skipped: number; errors: number }> {
  const uncommitted = getUncommittedEntries();
  let replayed = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of uncommitted) {
    const handler = TARGET_MAP[entry.target];
    if (!handler) {
      skipped++;
      continue;
    }
    try {
      await handler(client, entry.args);
      markCommitted(entry.id);
      replayed++;
    } catch {
      errors++;
      // Leave entry uncommitted for next replay attempt
    }
  }

  return { replayed, skipped, errors };
}
