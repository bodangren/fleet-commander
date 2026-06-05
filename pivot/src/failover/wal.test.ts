import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Use a temp WAL dir for tests
const TEST_WAL_DIR = join(import.meta.dir, '.test-wal');

describe('WAL', () => {
  beforeEach(() => {
    if (existsSync(TEST_WAL_DIR)) rmSync(TEST_WAL_DIR, { recursive: true });
    mkdirSync(TEST_WAL_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_WAL_DIR)) rmSync(TEST_WAL_DIR, { recursive: true });
  });

  test('append writes JSONL entry to today\'s file', () => {
    // We test the module indirectly by checking file creation
    // Since wal.ts uses homedir(), we test getUncommittedEntries logic
    const { append, getUncommittedEntries, markCommitted } = require('../failover/wal');

    const entry = append({
      type: 'mutation',
      target: 'executionLogs.appendLog',
      args: { projectSlug: 'test', runId: 'run-1', status: 'running', summary: 'test' },
    });

    expect(entry.id).toBeTruthy();
    expect(entry.type).toBe('mutation');
    expect(entry.target).toBe('executionLogs.appendLog');
    expect(entry.committed).toBe(false);

    // Verify file was written
    const walDir = require('../failover/wal').getWalDir();
    const today = new Date().toISOString().slice(0, 10);
    const walPath = join(walDir, `${today}.jsonl`);
    expect(existsSync(walPath)).toBe(true);

    const content = readFileSync(walPath, 'utf8');
    expect(content).toContain(entry.id);
    expect(content).toContain('executionLogs.appendLog');
  });

  test('markCommitted excludes entry from uncommitted list', () => {
    const { append, getUncommittedEntries, markCommitted } = require('../failover/wal');

    const entry = append({
      type: 'mutation',
      target: 'fleetCatalog.upsertTask',
      args: { taskKey: 'task-1' },
    });

    let uncommitted = getUncommittedEntries();
    expect(uncommitted.some((e: any) => e.id === entry.id)).toBe(true);

    markCommitted(entry.id);

    uncommitted = getUncommittedEntries();
    expect(uncommitted.some((e: any) => e.id === entry.id)).toBe(false);
  }, 20_000);

  test('generateId produces unique IDs', () => {
    const { generateId } = require('../failover/wal');
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
