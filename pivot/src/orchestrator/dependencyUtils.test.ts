import { describe, expect, it } from 'bun:test';
import {
  detectCycle,
  topologicalSort,
  computeCriticalPath,
  getBlockedChain,
  estimateUnblockTime,
} from './dependencyUtils';
import type { Task } from './types';

function makeTask(
  taskKey: string,
  deps: string[] = [],
  storyPoints: number = 3,
  status: string = 'ready',
): Task {
  return {
    projectSlug: 'test',
    trackId: 'track-1',
    taskKey,
    title: `Task ${taskKey}`,
    status: status as Task['status'],
    dependencies: deps,
    updatedAt: Date.now(),
    storyPoints,
  } as Task;
}

describe('detectCycle', () => {
  it('returns no cycle for empty graph', () => {
    const edges = new Map<string, string[]>();
    const result = detectCycle('A', 'B', edges);
    expect(result.hasCycle).toBe(false);
  });

  it('detects self-dependency', () => {
    const edges = new Map<string, string[]>();
    const result = detectCycle('A', 'A', edges);
    expect(result.hasCycle).toBe(true);
    expect(result.cyclePath).toEqual(['A', 'A']);
  });

  it('detects 2-node cycle', () => {
    const edges = new Map([['B', ['A']]]);
    const result = detectCycle('A', 'B', edges);
    expect(result.hasCycle).toBe(true);
  });

  it('detects 3-node cycle', () => {
    const edges = new Map([
      ['B', ['C']],
      ['C', ['A']],
    ]);
    const result = detectCycle('A', 'B', edges);
    expect(result.hasCycle).toBe(true);
  });

  it('returns no cycle for valid DAG', () => {
    const edges = new Map([
      ['A', ['B']],
      ['B', ['C']],
      ['C', []],
    ]);
    const result = detectCycle('D', 'A', edges);
    expect(result.hasCycle).toBe(false);
  });

  it('returns no cycle when adding non-cyclic edge', () => {
    const edges = new Map([
      ['A', ['B']],
      ['B', []],
      ['C', []],
    ]);
    const result = detectCycle('C', 'A', edges);
    expect(result.hasCycle).toBe(false);
  });
});

describe('topologicalSort', () => {
  it('sorts linear chain', () => {
    const tasks = [
      makeTask('A', []),
      makeTask('B', ['A']),
      makeTask('C', ['B']),
    ];
    const result = topologicalSort(tasks);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted.indexOf('A')).toBeLessThan(result.sorted.indexOf('B'));
    expect(result.sorted.indexOf('B')).toBeLessThan(result.sorted.indexOf('C'));
  });

  it('sorts diamond graph', () => {
    const tasks = [
      makeTask('A', []),
      makeTask('B', ['A']),
      makeTask('C', ['A']),
      makeTask('D', ['B', 'C']),
    ];
    const result = topologicalSort(tasks);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted.indexOf('A')).toBeLessThan(result.sorted.indexOf('B'));
    expect(result.sorted.indexOf('A')).toBeLessThan(result.sorted.indexOf('C'));
    expect(result.sorted.indexOf('B')).toBeLessThan(result.sorted.indexOf('D'));
    expect(result.sorted.indexOf('C')).toBeLessThan(result.sorted.indexOf('D'));
  });

  it('handles disconnected components', () => {
    const tasks = [
      makeTask('A', []),
      makeTask('B', []),
      makeTask('C', ['A']),
      makeTask('D', ['B']),
    ];
    const result = topologicalSort(tasks);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted).toHaveLength(4);
  });

  it('detects cycle', () => {
    const tasks = [
      makeTask('A', ['C']),
      makeTask('B', ['A']),
      makeTask('C', ['B']),
    ];
    const result = topologicalSort(tasks);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleMembers).toBeDefined();
    expect(result.cycleMembers!.length).toBeGreaterThan(0);
  });

  it('handles empty task list', () => {
    const result = topologicalSort([]);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted).toEqual([]);
  });
});

describe('computeCriticalPath', () => {
  it('computes simple chain', () => {
    const tasks = [
      makeTask('A', [], 3),
      makeTask('B', ['A'], 5),
      makeTask('C', ['B'], 2),
    ];
    const result = computeCriticalPath(tasks);
    expect(result.path).toEqual(['A', 'B', 'C']);
    expect(result.totalStoryPoints).toBe(10);
    expect(result.length).toBe(3);
  });

  it('takes longer branch in diamond', () => {
    const tasks = [
      makeTask('A', [], 2),
      makeTask('B', ['A'], 8),
      makeTask('C', ['A'], 3),
      makeTask('D', ['B', 'C'], 1),
    ];
    const result = computeCriticalPath(tasks);
    expect(result.path).toEqual(['A', 'B', 'D']);
    expect(result.totalStoryPoints).toBe(11);
  });

  it('handles parallel paths', () => {
    const tasks = [
      makeTask('A', [], 5),
      makeTask('B', [], 3),
      makeTask('C', ['A'], 2),
      makeTask('D', ['B'], 10),
    ];
    const result = computeCriticalPath(tasks);
    expect(result.path).toEqual(['B', 'D']);
    expect(result.totalStoryPoints).toBe(13);
  });

  it('returns empty for cycle', () => {
    const tasks = [
      makeTask('A', ['B']),
      makeTask('B', ['A']),
    ];
    const result = computeCriticalPath(tasks);
    expect(result.path).toEqual([]);
    expect(result.totalStoryPoints).toBe(0);
  });

  it('handles single task', () => {
    const tasks = [makeTask('A', [], 5)];
    const result = computeCriticalPath(tasks);
    expect(result.path).toEqual(['A']);
    expect(result.totalStoryPoints).toBe(5);
  });
});

describe('getBlockedChain', () => {
  it('returns direct blockers', () => {
    const tasks = [
      makeTask('A', [], 3, 'done'),
      makeTask('B', ['A'], 3, 'blocked'),
    ];
    const chain = getBlockedChain('B', tasks);
    expect(chain).toHaveLength(1);
    expect(chain[0].taskKey).toBe('A');
    expect(chain[0].depth).toBe(1);
  });

  it('returns transitive blockers', () => {
    const tasks = [
      makeTask('A', [], 3, 'ready'),
      makeTask('B', ['A'], 3, 'ready'),
      makeTask('C', ['B'], 3, 'blocked'),
    ];
    const chain = getBlockedChain('C', tasks);
    expect(chain).toHaveLength(2);
    expect(chain.find((b) => b.taskKey === 'B')).toBeDefined();
    expect(chain.find((b) => b.taskKey === 'A')).toBeDefined();
  });

  it('returns empty for no blockers', () => {
    const tasks = [makeTask('A', [], 3, 'ready')];
    const chain = getBlockedChain('A', tasks);
    expect(chain).toEqual([]);
  });

  it('returns empty for unknown task', () => {
    const chain = getBlockedChain('UNKNOWN', []);
    expect(chain).toEqual([]);
  });

  it('avoids infinite loop on cycle', () => {
    const tasks = [
      { ...makeTask('A', ['B']), dependencies: ['B'] },
      { ...makeTask('B', ['A']), dependencies: ['A'] },
    ];
    const chain = getBlockedChain('A', tasks);
    expect(chain.length).toBeLessThanOrEqual(2);
  });
});

describe('estimateUnblockTime', () => {
  it('returns 0 when no blockers', () => {
    const task = makeTask('A', [], 3, 'ready');
    const time = estimateUnblockTime(task, [task]);
    expect(time).toBe(0);
  });

  it('estimates time for single blocker', () => {
    const blocker = makeTask('B', [], 6, 'in_progress');
    const task = makeTask('A', ['B'], 3, 'blocked');
    const time = estimateUnblockTime(task, [task, blocker], 2);
    expect(time).toBe(180); // 6 points / 2 pts/hr = 3 hours = 180 min
  });

  it('estimates time for multiple blockers', () => {
    const b1 = makeTask('B', [], 4, 'ready');
    const b2 = makeTask('C', [], 2, 'in_progress');
    const task = makeTask('A', ['B', 'C'], 3, 'blocked');
    const time = estimateUnblockTime(task, [task, b1, b2], 2);
    expect(time).toBe(180); // (4+2) / 2 = 3 hours = 180 min
  });

  it('skips done blockers', () => {
    const done = makeTask('B', [], 6, 'done');
    const task = makeTask('A', ['B'], 3, 'blocked');
    const time = estimateUnblockTime(task, [task, done], 2);
    expect(time).toBe(0);
  });
});
