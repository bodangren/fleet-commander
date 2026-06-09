import { describe, expect, it, mock, beforeEach } from 'bun:test';
import type { Task } from '../types';

// Mock dependencies before importing the module under test
const mockSelectBestCandidate = mock(async () => null as any);
const mockGetBestTask = mock(() => null as any);
const mockListDispatchPolicyStats = mock(async () => [] as any[]);
const mockListHarnessReliabilityStats = mock(async () => [] as any[]);
const mockLoadDispatchOptions = mock(() => ({}));
const mockLogAndCaptureError = mock(async () => {});

mock.module('../../policy/statsClient', () => ({
  listDispatchPolicyStats: mockListDispatchPolicyStats,
  listHarnessReliabilityStats: mockListHarnessReliabilityStats,
}));

mock.module('../../policy/dispatch', () => ({
  selectBestCandidate: mockSelectBestCandidate,
}));

mock.module('../evaluator', () => ({
  getBestTask: mockGetBestTask,
}));

mock.module('../../policy/weightPresets', () => ({
  loadDispatchOptions: mockLoadDispatchOptions,
}));

mock.module('../logger', () => ({
  logAndCaptureError: mockLogAndCaptureError,
}));

import { scoreCandidates, _resetPolicyStatsCacheForTests } from './scoreCandidates';

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
  const mockClient = {
    mutation: mock(async () => ({})),
    query: mock(async () => []),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    mockSelectBestCandidate.mockReset();
    mockGetBestTask.mockReset();
    mockListDispatchPolicyStats.mockReset();
    mockListHarnessReliabilityStats.mockReset();
    mockLoadDispatchOptions.mockReset();
    mockLogAndCaptureError.mockReset();
    _resetPolicyStatsCacheForTests();
  });

  it('returns null when no eligible tasks', async () => {
    mockListDispatchPolicyStats.mockResolvedValueOnce([]);
    mockListHarnessReliabilityStats.mockResolvedValueOnce([]);
    mockSelectBestCandidate.mockResolvedValueOnce(null);

    const result = await scoreCandidates(mockClient as any, 'proj', [], new Map());
    expect(result).toBeNull();
  });

  it('uses adaptive scoring when stats are available', async () => {
    const task = makeTask();
    const expected = {
      task,
      trackId: 'track-a',
      score: 1.5,
      breakdown: { priority: 1 },
      justification: 'best fit',
      llmTieBreak: false,
    };
    mockListDispatchPolicyStats.mockResolvedValueOnce([]);
    mockListHarnessReliabilityStats.mockResolvedValueOnce([]);
    mockSelectBestCandidate.mockResolvedValueOnce(expected);

    const result = await scoreCandidates(
      mockClient as any,
      'proj',
      [task],
      new Map([['track-a', 'active']]),
    );

    expect(result).toEqual(expected);
    expect(mockSelectBestCandidate).toHaveBeenCalledTimes(1);
    expect(mockGetBestTask).not.toHaveBeenCalled();
  });

  it('falls back to legacy evaluator when stats loading returns null', async () => {
    const task = makeTask();
    mockListDispatchPolicyStats.mockRejectedValueOnce(new Error('Convex down'));
    mockListHarnessReliabilityStats.mockRejectedValueOnce(new Error('Convex down'));
    mockGetBestTask.mockReturnValueOnce({
      task,
      trackId: 'track-a',
      score: 1,
      rationale: 'only candidate',
    });

    const result = await scoreCandidates(
      mockClient as any,
      'proj',
      [task],
      new Map([['track-a', 'active']]),
    );

    expect(result).not.toBeNull();
    expect(result!.task.taskKey).toBe('t1');
    expect(result!.justification).toBe('only candidate');
    expect(result!.llmTieBreak).toBe(false);
    expect(mockGetBestTask).toHaveBeenCalledTimes(1);
  });

  it('returns null when both adaptive and legacy return nothing', async () => {
    mockListDispatchPolicyStats.mockRejectedValueOnce(new Error('Convex down'));
    mockListHarnessReliabilityStats.mockRejectedValueOnce(new Error('Convex down'));
    mockGetBestTask.mockReturnValueOnce(null);

    const result = await scoreCandidates(mockClient as any, 'proj', [], new Map());
    expect(result).toBeNull();
  });

  it('logs warning when selectBestCandidate throws and stale cache also fails', async () => {
    // Stats load fine, but selectBestCandidate throws both times (fresh + stale)
    mockListDispatchPolicyStats.mockResolvedValueOnce([]);
    mockListHarnessReliabilityStats.mockResolvedValueOnce([]);
    mockSelectBestCandidate
      .mockRejectedValueOnce(new Error('dispatch exploded'))   // fresh attempt
      .mockRejectedValueOnce(new Error('stale also failed'));  // stale cache attempt
    mockGetBestTask.mockReturnValueOnce(null);

    await scoreCandidates(mockClient as any, 'proj', [], new Map());

    expect(mockLogAndCaptureError.mock.calls.length).toBeGreaterThanOrEqual(1);
    const lastCall = mockLogAndCaptureError.mock.calls[mockLogAndCaptureError.mock.calls.length - 1] as unknown[];
    const args = lastCall[3] as Record<string, unknown>;
    expect(args.operation).toBe('selectBestCandidate');
  });

  it('uses stale cache when fresh stats fail', async () => {
    const task = makeTask();
    // First call populates cache
    mockListDispatchPolicyStats.mockResolvedValueOnce([]);
    mockListHarnessReliabilityStats.mockResolvedValueOnce([]);
    mockSelectBestCandidate.mockResolvedValueOnce({
      task,
      trackId: 'track-a',
      score: 2,
      breakdown: {},
      justification: 'cached',
      llmTieBreak: false,
    });
    await scoreCandidates(
      mockClient as any,
      'proj',
      [task],
      new Map([['track-a', 'active']]),
    );

    // Second call fails fresh but uses stale cache
    mockListDispatchPolicyStats.mockRejectedValueOnce(new Error('down'));
    mockListHarnessReliabilityStats.mockRejectedValueOnce(new Error('down'));
    mockSelectBestCandidate.mockResolvedValueOnce({
      task,
      trackId: 'track-a',
      score: 2,
      breakdown: {},
      justification: 'stale cached',
      llmTieBreak: false,
    });

    const result = await scoreCandidates(
      mockClient as any,
      'proj',
      [task],
      new Map([['track-a', 'active']]),
    );

    expect(result).not.toBeNull();
    expect(result!.justification).toBe('stale cached');
  });
});
