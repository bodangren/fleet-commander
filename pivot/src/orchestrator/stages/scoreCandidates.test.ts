import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type {
  DispatchPolicyStatsInput,
  HarnessReliabilityStatsInput,
} from '../../policy/statsClient';
import type { Task } from '../types';
import { _resetPolicyStatsCacheForTests, scoreCandidates } from './scoreCandidates';

interface RecordingClient {
  query: ReturnType<typeof mock>;
  mutation: ReturnType<typeof mock>;
}

interface ClientOptions {
  policyStats?: DispatchPolicyStatsInput[];
  harnessStats?: HarnessReliabilityStatsInput[];
}

function createRecordingClient(options: ClientOptions = {}): RecordingClient {
  const policyStats = options.policyStats ?? [];
  const harnessStats = options.harnessStats ?? [];

  return {
    query: mock(async (_reference: unknown, args?: Record<string, unknown>) => {
      if (args?.limit === 1000) return policyStats;
      if (args?.limit === 100) return harnessStats;
      return [];
    }),
    mutation: mock(async () => undefined),
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    projectSlug: 'p',
    trackId: 'track-a',
    taskKey: 't1',
    title: 'Test task',
    status: 'backlog',
    dependencies: [],
    updatedAt: 0,
    ...overrides,
  };
}

describe('scoreCandidates stage', () => {
  beforeEach(() => {
    _resetPolicyStatsCacheForTests();
  });

  it('returns null when no eligible tasks', async () => {
    const client = createRecordingClient();

    const result = await scoreCandidates(client as any, 'proj', [], new Map());

    expect(result).toBeNull();
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('uses real adaptive scoring when policy statistics are available', async () => {
    const task = makeTask({ title: 'priority:high adaptive task' });
    const client = createRecordingClient();

    const result = await scoreCandidates(
      client as any,
      'proj',
      [task],
      new Map([['track-a', 'active']]),
    );

    expect(result).toMatchObject({
      task,
      trackId: 'track-a',
      llmTieBreak: false,
    });
    expect(result?.score).toBeGreaterThan(0);
    expect(result?.breakdown.priorityWeight).toBe(2);
    expect(result?.justification).toContain('Highest score');
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('falls back to the real legacy evaluator when statistics queries fail', async () => {
    const task = makeTask({ title: 'priority:high fallback task' });
    const client = createRecordingClient();
    (client.query as any).mockImplementation(async () => {
      throw new Error('Convex down');
    });

    const result = await scoreCandidates(
      client as any,
      'proj',
      [task],
      new Map([['track-a', 'active']]),
    );

    expect(result).toMatchObject({
      task,
      trackId: 'track-a',
      justification: 'high priority',
      llmTieBreak: false,
    });
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('returns null when neither adaptive scoring nor the legacy evaluator has a task', async () => {
    const client = createRecordingClient();
    (client.query as any).mockImplementation(async () => {
      throw new Error('Convex down');
    });

    const result = await scoreCandidates(client as any, 'proj', [], new Map());

    expect(result).toBeNull();
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('records a warning and falls back when adaptive scoring throws twice', async () => {
    const task = makeTask();
    Object.defineProperty(task, 'tags', {
      get() {
        throw new Error('adaptive scoring exploded');
      },
    });
    const client = createRecordingClient();

    const result = await scoreCandidates(
      client as any,
      'proj',
      [task],
      new Map([['track-a', 'active']]),
    );

    expect(result?.task).toBe(task);
    expect(result).toMatchObject({ trackId: 'track-a', llmTieBreak: false });
    expect(result?.justification).toBe('normal priority');
    const logArgs = (client.mutation as any).mock.calls
      .map((call: unknown[]) => call[1] as Record<string, unknown>)
      .find((args: Record<string, unknown>) => args.operation === 'selectBestCandidate');
    expect(logArgs).toMatchObject({
      projectSlug: 'proj',
      severity: 'warning',
      operation: 'selectBestCandidate',
    });
  });

  it('reuses populated policy statistics without another query', async () => {
    const task = makeTask();
    const client = createRecordingClient();

    const first = await scoreCandidates(
      client as any,
      'proj',
      [task],
      new Map([['track-a', 'active']]),
    );
    expect(first?.task.taskKey).toBe('t1');
    expect(client.query).toHaveBeenCalledTimes(2);

    (client.query as any).mockImplementation(async () => {
      throw new Error('network is down after cache warmup');
    });

    const second = await scoreCandidates(
      client as any,
      'proj',
      [task],
      new Map([['track-a', 'active']]),
    );

    expect(second?.task.taskKey).toBe('t1');
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
