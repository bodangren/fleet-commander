/**
 * Phase 1 characterization net for the pure dependency helpers in
 * `dependencyUtils.ts`. Sits alongside the original `dependencyUtils.test.ts`
 * (which covers the happy paths) and adds the cross-phase edge cases called
 * out in `measure/tracks/task_dependencies_critical_path_20260605/test-strategy.md`
 * §3. The Red tests here are the explicit gating bar; the Green phase for
 * any failures lives in a follow-up commit.
 *
 * All fixtures come from `./__fixtures__/dependencyFixtures` per
 * test-strategy §2 so the same scenario names line up across Phase 1/2/4.
 */

import { describe, expect, it } from 'bun:test';

import {
  computeCriticalPath,
  detectCycle,
  estimateUnblockTime,
  getBlockedChain,
  topologicalSort,
} from './dependencyUtils';
import {
  diamond,
  disconnected,
  linearChain3,
  makeTask,
  missingDependencyGraph,
  parallelBranches,
  selfLoop,
  threeCycle,
  twoCycle,
} from './__fixtures__/dependencyFixtures';

describe('characterization: detectCycle (extended)', () => {
  it('detects a cycle through a transitive path', () => {
    // A depends on B, B depends on C, C depends on A.
    // Adding an edge A -> B closes the loop.
    const edges = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['C']],
      ['C', ['A']],
    ]);
    const result = detectCycle('A', 'B', edges);
    expect(result.hasCycle).toBe(true);
    expect(result.cyclePath).toBeDefined();
    expect(result.cyclePath).toContain('A');
  });

  it('returns no cycle for two disjoint valid chains', () => {
    const edges = new Map<string, string[]>([
      ['A', ['B']],
      ['C', ['D']],
    ]);
    const result = detectCycle('E', 'A', edges);
    expect(result.hasCycle).toBe(false);
  });
});

describe('characterization: topologicalSort (extended)', () => {
  it('skips a dependency key that does not exist in the task set', () => {
    // test-strategy §3 item 5: pure functions must skip silently.
    const result = topologicalSort(missingDependencyGraph);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted).toHaveLength(2);
    expect(result.sorted).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('reports a self-referencing task as a cycle', () => {
    const result = topologicalSort(selfLoop);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleMembers).toEqual(['A']);
  });

  it('reports a 2-node cycle', () => {
    const result = topologicalSort(twoCycle);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleMembers).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('reports a 3-node cycle', () => {
    const result = topologicalSort(threeCycle);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleMembers).toEqual(expect.arrayContaining(['A', 'B', 'C']));
  });

  it('orders linearChain3 such that each dependency precedes its dependent', () => {
    const result = topologicalSort(linearChain3);
    expect(result.hasCycle).toBe(false);
    const idx = (k: string) => result.sorted.indexOf(k);
    expect(idx('A')).toBeLessThan(idx('B'));
    expect(idx('B')).toBeLessThan(idx('C'));
  });
});

describe('characterization: computeCriticalPath (regression gate)', () => {
  it('takes heavier branch in diamond, not first-discovered branch', () => {
    // Named regression test from test-strategy §5 / plan §16.
    // The diamond has two branches of total weight 11 (A->B->D) and 6
    // (A->C->D). The algorithm MUST pick the heavier branch.
    const result = computeCriticalPath(diamond);
    expect(result.path).toEqual(['A', 'B', 'D']);
    expect(result.totalStoryPoints).toBe(11);
    expect(result.length).toBe(3);
  });

  it('uses parallelBranches fixture and picks the heavier branch', () => {
    const result = computeCriticalPath(parallelBranches);
    expect(result.path).toEqual(['B', 'D']);
    expect(result.totalStoryPoints).toBe(13);
  });

  it('picks a heaviest path across disconnected components', () => {
    // Component 1: A (5) -> B (3) = 8 points, ends at B.
    // Component 2: C (1) -> D (7) = 8 points, ends at D.
    // Both components have equal weight (8). The algorithm must NOT
    // return a path that crosses components or visits only one of them;
    // it must select one of the two component-local heaviest paths.
    const result = computeCriticalPath(disconnected);
    expect(result.totalStoryPoints).toBe(8);
    expect(result.length).toBe(2);
    // The path must be one of the two valid critical paths.
    const isAtoB =
      result.path.length === 2 &&
      result.path[0] === 'A' &&
      result.path[1] === 'B';
    const isCtoD =
      result.path.length === 2 &&
      result.path[0] === 'C' &&
      result.path[1] === 'D';
    expect(isAtoB || isCtoD).toBe(true);
  });

  it('returns empty path for a 2-node cycle', () => {
    const result = computeCriticalPath(twoCycle);
    expect(result.path).toEqual([]);
    expect(result.totalStoryPoints).toBe(0);
    expect(result.length).toBe(0);
  });

  it('returns empty path for a 3-node cycle', () => {
    const result = computeCriticalPath(threeCycle);
    expect(result.path).toEqual([]);
    expect(result.totalStoryPoints).toBe(0);
  });

  it('returns empty path for a self-loop', () => {
    const result = computeCriticalPath(selfLoop);
    expect(result.path).toEqual([]);
    expect(result.totalStoryPoints).toBe(0);
  });
});

describe('characterization: getBlockedChain (extended)', () => {
  it('includes a done blocker in the chain (the filter lives in estimateUnblockTime)', () => {
    // test-strategy §3 item 6: getBlockedChain returns the entry, even
    // when the blocker is done; estimateUnblockTime is the one that excludes.
    const tasks = [
      makeTask({ taskKey: 'A', storyPoints: 3, status: 'done' }),
      makeTask({ taskKey: 'B', dependencies: ['A'], storyPoints: 3, status: 'blocked' }),
    ];
    const chain = getBlockedChain('B', tasks);
    expect(chain).toHaveLength(1);
    expect(chain[0].taskKey).toBe('A');
    expect(chain[0].status).toBe('done');
    expect(chain[0].depth).toBe(1);
  });

  it('skips a dependency key that does not exist', () => {
    const tasks = [
      makeTask({ taskKey: 'A' }),
      makeTask({ taskKey: 'B', dependencies: ['A', 'NONEXISTENT'] }),
    ];
    const chain = getBlockedChain('B', tasks);
    expect(chain).toHaveLength(1);
    expect(chain[0].taskKey).toBe('A');
  });
});

describe('characterization: estimateUnblockTime (extended)', () => {
  it('uses the longest blocker chain, not the sum of all blockers [RED]', () => {
    // Diamond blocker graph for D:
    //   A (3) is shared root. B (5) and C (2) both depend on A.
    //   D depends on B and C.
    // Transitive blocker chain for D: {A, B, C} (B and C at depth 1, A at depth 2).
    // The longest weighted path through the blockers is A (3) -> B (5) = 8.
    // The other path is A (3) -> C (2) = 5.
    //
    // Per test-strategy §3 item 3 (and the in-source comment on
    // dependencyUtils.ts:253-254), estimateUnblockTime should reflect the
    // longest chain. Current implementation (dependencyUtils.ts:262-266)
    // sums every incomplete blocker's storyPoints (3+5+2 = 10), which
    // over-counts when a blocker is shared across multiple paths.
    //
    // With throughput 2 pts/hr, expected per strategy intent:
    //   8 / 2 * 60 = 240 min
    // Current behavior: 10 / 2 * 60 = 300 min.
    const a = makeTask({ taskKey: 'A', storyPoints: 3, status: 'ready' });
    const b = makeTask({ taskKey: 'B', dependencies: ['A'], storyPoints: 5, status: 'ready' });
    const c = makeTask({ taskKey: 'C', dependencies: ['A'], storyPoints: 2, status: 'ready' });
    const d = makeTask({ taskKey: 'D', dependencies: ['B', 'C'], storyPoints: 1, status: 'blocked' });
    const time = estimateUnblockTime(d, [d, a, b, c], 2);
    expect(time).toBe(240);
  });

  it('returns Infinity when throughput is zero', () => {
    const blocker = makeTask({ taskKey: 'A', storyPoints: 5, status: 'ready' });
    const blocked = makeTask({ taskKey: 'B', dependencies: ['A'], storyPoints: 3, status: 'blocked' });
    expect(estimateUnblockTime(blocked, [blocked, blocker], 0)).toBe(Infinity);
  });

  it('returns Infinity when throughput is negative', () => {
    const blocker = makeTask({ taskKey: 'A', storyPoints: 5, status: 'ready' });
    const blocked = makeTask({ taskKey: 'B', dependencies: ['A'], storyPoints: 3, status: 'blocked' });
    expect(estimateUnblockTime(blocked, [blocked, blocker], -1)).toBe(Infinity);
  });

  it('excludes a done blocker from the time estimate (mixed chain)', () => {
    // test-strategy §3 item 6: estimateUnblockTime excludes done blockers.
    // A is done (skip), B is incomplete with 3 points.
    const done = makeTask({ taskKey: 'A', storyPoints: 6, status: 'done' });
    const incomplete = makeTask({ taskKey: 'B', storyPoints: 3, status: 'ready' });
    const blocked = makeTask({
      taskKey: 'C',
      dependencies: ['A', 'B'],
      storyPoints: 1,
      status: 'blocked',
    });
    // Only B contributes: 3 / 2 * 60 = 90 min.
    expect(estimateUnblockTime(blocked, [blocked, done, incomplete], 2)).toBe(90);
  });
});
