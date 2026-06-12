/**
 * Phase S3 Red tests for the WAL's support of quality-run mutations.
 *
 * The S3 phase "Persist And Recover Quality Runs" requires the WAL
 * (`pivot/src/failover/wal.ts`) to recognize the new quality-run
 * target strings produced by the focused sibling lifecycle that
 * persists quality events. These tests pin the contract that:
 *
 *   1. `replay()` returns a successful replay count for the new
 *      `qualityRuns.startQualityRun`, `qualityRuns.appendStageAttempt`,
 *      and `qualityRuns.finishQualityRun` target strings (currently
 *      the WAL classifies them as unsupported and increments the
 *      `skipped` counter).
 *   2. Replay preserves insertion order: an entry appended before
 *      another is replayed first.
 *   3. Replay is duplicate-safe: re-running replay on a WAL whose
 *      first entry is already committed does not re-execute the
 *      handler (the entry is filtered out before the loop).
 *   4. Replay tolerates corrupt JSONL lines by skipping them and
 *      does not crash the replay loop.
 *   5. Unsupported target strings increment the `skipped` counter
 *      without throwing.
 *
 * The implementation does not yet wire the quality-run targets into
 * `wal.ts`'s `TARGET_MAP` and replay does not yet handle them. These
 * tests are intentionally Red and committed under the `*.red.test.ts`
 * suffix per the S3 test-strategy §7 "Intentionally-red tests &
 * exclusion" rule.
 *
 * Owned by Phase S3 Test task 2; the `[~]` marker in `plan.md`
 * references this file. The Green sibling lands when the WAL is
 * extended with the quality-run target strings and these tests pass.
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  append as walAppend,
  clear as walClear,
  getWalDir,
  replay as walReplay,
  generateId as walGenerateId,
} from './wal';

const walDir = getWalDir();
const today = new Date().toISOString().slice(0, 10);
const todayWalPath = join(walDir, `${today}.jsonl`);

beforeEach(() => {
  walClear();
  mkdirSync(walDir, { recursive: true });
});

afterEach(() => {
  walClear();
});

describe('wal.replay() — supported quality-run mutations', () => {
  it('replays qualityRuns.startQualityRun (target string is recognized)', async () => {
    const calls: Array<{ fn: string; args: unknown }> = [];
    const client = {
      mutation: async (fn: unknown, args: unknown) => {
        calls.push({ fn: String(fn), args });
        return {};
      },
    } as never;

    walAppend({
      type: 'mutation',
      target: 'qualityRuns.startQualityRun',
      args: {
        projectSlug: 'demo',
        runId: 'run-1',
        taskKey: 'task-7',
        idempotencyKey: 'idem-1',
        profileName: 'standard',
        profileVersion: 1,
        now: 1_700_000_000_000,
      },
    });

    const result = await walReplay(client);

    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.replayed).toBe(1);
  });

  it('replays qualityRuns.appendStageAttempt (target string is recognized)', async () => {
    let observed = 0;
    const client = {
      mutation: async (fn: unknown, args: unknown) => {
        if (String(fn).includes('appendStageAttempt')) observed += 1;
        return args;
      },
    } as never;

    walAppend({
      type: 'mutation',
      target: 'qualityRuns.appendStageAttempt',
      args: {
        projectSlug: 'demo',
        runId: 'run-1',
        stageKind: 'red',
        role: 'executor',
        attempt: 1,
        status: 'passed',
        startedAt: 1_700_000_000_010,
        finishedAt: 1_700_000_000_030,
        costUSD: 0.42,
        tokens: 1_600,
        model: 'claude-sonnet-4',
        now: 1_700_000_000_030,
      },
    });

    const result = await walReplay(client);

    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.replayed).toBe(1);
    expect(observed).toBe(1);
  });

  it('replays qualityRuns.finishQualityRun (target string is recognized)', async () => {
    let observed = 0;
    const client = {
      mutation: async (fn: unknown, args: unknown) => {
        if (String(fn).includes('finishQualityRun')) observed += 1;
        return args;
      },
    } as never;

    walAppend({
      type: 'mutation',
      target: 'qualityRuns.finishQualityRun',
      args: {
        projectSlug: 'demo',
        runId: 'run-1',
        status: 'passed',
        now: 1_700_000_000_200,
      },
    });

    const result = await walReplay(client);

    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.replayed).toBe(1);
    expect(observed).toBe(1);
  });
});

describe('wal.replay() — ordering', () => {
  it('preserves insertion order across a mixed target set (start → append → finish)', async () => {
    const observed: string[] = [];
    const client = {
      mutation: async (fn: unknown, args: unknown) => {
        const a = args as { stageKind?: string; status?: string; runId?: string };
        observed.push(a.stageKind ?? a.status ?? 'start');
        return args;
      },
    } as never;

    walAppend({
      type: 'mutation',
      target: 'qualityRuns.startQualityRun',
      args: { runId: 'r-order', projectSlug: 'demo', taskKey: 't', idempotencyKey: 'k', profileName: 'standard', profileVersion: 1, now: 1 },
    });
    walAppend({
      type: 'mutation',
      target: 'qualityRuns.appendStageAttempt',
      args: { runId: 'r-order', stageKind: 'red', role: 'executor', attempt: 1, status: 'passed', startedAt: 2, finishedAt: 3, costUSD: 0, tokens: 0, model: 'm', now: 3 },
    });
    walAppend({
      type: 'mutation',
      target: 'qualityRuns.appendStageAttempt',
      args: { runId: 'r-order', stageKind: 'green', role: 'executor', attempt: 1, status: 'passed', startedAt: 4, finishedAt: 5, costUSD: 0, tokens: 0, model: 'm', now: 5 },
    });
    walAppend({
      type: 'mutation',
      target: 'qualityRuns.finishQualityRun',
      args: { runId: 'r-order', status: 'passed', now: 6 },
    });

    const result = await walReplay(client);

    expect(result.errors).toBe(0);
    expect(result.replayed).toBe(4);
    expect(observed).toEqual(['start', 'red', 'green', 'passed']);
  });
});

describe('wal.replay() — duplicate replay', () => {
  it('does not re-execute an entry that is already marked committed', async () => {
    let observed = 0;
    const client = {
      mutation: async (fn: unknown, args: unknown) => {
        if (String(fn).includes('startQualityRun')) observed += 1;
        return args;
      },
    } as never;

    const entry = walAppend({
      type: 'mutation',
      target: 'qualityRuns.startQualityRun',
      args: { runId: 'r-dup', projectSlug: 'demo', taskKey: 't', idempotencyKey: 'k', profileName: 'standard', profileVersion: 1, now: 1 },
    });

    const first = await walReplay(client);
    expect(first.replayed).toBe(1);
    expect(observed).toBe(1);

    // Append a commit marker manually (simulates the production markCommitted path).
    const marker = {
      id: entry.id,
      type: 'mutation',
      target: '__wal_commit__',
      args: {},
      timestamp: Date.now(),
      committed: true,
    };
    writeFileSync(todayWalPath, readFileSync(todayWalPath, 'utf8') + JSON.stringify(marker) + '\n', 'utf8');

    const second = await walReplay(client);
    expect(second.replayed).toBe(0);
    expect(observed).toBe(1);
  });
});

describe('wal.replay() — corrupt JSONL tolerance', () => {
  it('skips a corrupt line and continues replaying the remaining entries', async () => {
    let observed = 0;
    const client = {
      mutation: async (fn: unknown, args: unknown) => {
        if (String(fn).includes('startQualityRun')) observed += 1;
        return args;
      },
    } as never;

    walAppend({
      type: 'mutation',
      target: 'qualityRuns.startQualityRun',
      args: { runId: 'r', projectSlug: 'demo', taskKey: 't', idempotencyKey: 'k', profileName: 'standard', profileVersion: 1, now: 1 },
    });
    // Inject a corrupt line at the end of today's WAL.
    if (existsSync(todayWalPath)) {
      writeFileSync(todayWalPath, readFileSync(todayWalPath, 'utf8') + '{ this is not valid json\n', 'utf8');
    }

    const result = await walReplay(client);

    expect(result.errors).toBe(0);
    expect(result.replayed).toBe(1);
    expect(observed).toBe(1);
  });
});

describe('wal.replay() — unsupported target visibility', () => {
  it('increments the skipped counter for an unknown target without throwing', async () => {
    const client = {
      mutation: async (fn: unknown, args: unknown) => args,
    } as never;

    walAppend({
      type: 'mutation',
      target: 'unknownMutation.future',
      args: { whatever: 1 },
    });

    const result = await walReplay(client);

    expect(result.errors).toBe(0);
    expect(result.replayed).toBe(0);
    expect(result.skipped).toBe(1);
  });
});

// Reference walGenerateId so the import is not dropped by the linter — used
// by the Green sibling when wiring idempotency keys through the WAL.
void walGenerateId;
