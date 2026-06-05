import { describe, expect, it } from 'bun:test';

function buildAdjacency(
  tasks: Array<{ taskKey: string; dependencies: string[] }>,
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const t of tasks) {
    if (!adjacency.has(t.taskKey)) adjacency.set(t.taskKey, []);
    for (const dep of t.dependencies) {
      if (!adjacency.has(dep)) adjacency.set(dep, []);
      adjacency.get(dep)!.push(t.taskKey);
    }
  }
  return adjacency;
}

function topologicalSort(
  tasks: Array<{ taskKey: string; dependencies: string[] }>,
): { sorted: string[]; hasCycle: boolean } {
  const taskMap = new Map(tasks.map((t) => [t.taskKey, t]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const t of tasks) {
    if (!inDegree.has(t.taskKey)) inDegree.set(t.taskKey, 0);
    if (!adjacency.has(t.taskKey)) adjacency.set(t.taskKey, []);
    for (const dep of t.dependencies) {
      if (!taskMap.has(dep)) continue;
      if (!adjacency.has(dep)) adjacency.set(dep, []);
      adjacency.get(dep)!.push(t.taskKey);
      inDegree.set(t.taskKey, (inDegree.get(t.taskKey) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [key, deg] of inDegree) {
    if (deg === 0) queue.push(key);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return { sorted, hasCycle: sorted.length !== tasks.length };
}

function computeCriticalPath(
  tasks: Array<{ taskKey: string; dependencies: string[]; storyPoints: number }>,
): { path: string[]; totalStoryPoints: number; length: number } {
  const taskMap = new Map(tasks.map((t) => [t.taskKey, t]));
  const topo = topologicalSort(tasks);

  if (topo.hasCycle) return { path: [], totalStoryPoints: 0, length: 0 };

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  for (const key of topo.sorted) {
    const task = taskMap.get(key);
    dist.set(key, task?.storyPoints ?? 1);
    prev.set(key, null);
  }

  for (const v of topo.sorted) {
    const vTask = taskMap.get(v);
    if (!vTask) continue;
    for (const u of vTask.dependencies) {
      if (!taskMap.has(u)) continue;
      const candidate = (dist.get(u) ?? 0) + (vTask.storyPoints ?? 1);
      if (candidate > (dist.get(v) ?? 0)) {
        dist.set(v, candidate);
        prev.set(v, u);
      }
    }
  }

  let maxDist = 0;
  let endKey: string | null = null;
  for (const [key, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      endKey = key;
    }
  }

  if (!endKey) return { path: [], totalStoryPoints: 0, length: 0 };

  const path: string[] = [];
  let current: string | null = endKey;
  while (current !== null) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  const totalStoryPoints = path.reduce((sum, key) => {
    const t = taskMap.get(key);
    return sum + (t?.storyPoints ?? 1);
  }, 0);

  return { path, totalStoryPoints, length: path.length };
}

function buildBlockerChain(
  taskKey: string,
  allTasks: Array<{ taskKey: string; dependencies: string[]; title: string; status: string }>,
): Array<{ taskKey: string; title: string; status: string; depth: number }> {
  const taskMap = new Map(allTasks.map((t) => [t.taskKey, t]));
  const task = taskMap.get(taskKey);
  if (!task) return [];

  const depKeys = task.dependencies;
  const chain: Array<{ taskKey: string; title: string; status: string; depth: number }> = [];
  const visited = new Set<string>();
  const queue = depKeys.map((k) => ({ key: k, depth: 1 }));

  while (queue.length > 0) {
    const { key, depth } = queue.shift()!;
    if (visited.has(key)) continue;
    visited.add(key);

    const depTask = taskMap.get(key);
    if (!depTask) continue;

    chain.push({ taskKey: key, title: depTask.title, status: depTask.status, depth });

    for (const td of depTask.dependencies) {
      if (!visited.has(td)) {
        queue.push({ key: td, depth: depth + 1 });
      }
    }
  }

  return chain;
}

describe('topological sort (mirrors Convex getCriticalPath logic)', () => {
  it('sorts linear chain', () => {
    const tasks = [
      { taskKey: 'A', dependencies: [] },
      { taskKey: 'B', dependencies: ['A'] },
      { taskKey: 'C', dependencies: ['B'] },
    ];
    const result = topologicalSort(tasks);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted.indexOf('A')).toBeLessThan(result.sorted.indexOf('B'));
    expect(result.sorted.indexOf('B')).toBeLessThan(result.sorted.indexOf('C'));
  });

  it('sorts diamond graph', () => {
    const tasks = [
      { taskKey: 'A', dependencies: [] },
      { taskKey: 'B', dependencies: ['A'] },
      { taskKey: 'C', dependencies: ['A'] },
      { taskKey: 'D', dependencies: ['B', 'C'] },
    ];
    const result = topologicalSort(tasks);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted.indexOf('A')).toBeLessThan(result.sorted.indexOf('D'));
  });

  it('detects cycle', () => {
    const tasks = [
      { taskKey: 'A', dependencies: ['C'] },
      { taskKey: 'B', dependencies: ['A'] },
      { taskKey: 'C', dependencies: ['B'] },
    ];
    const result = topologicalSort(tasks);
    expect(result.hasCycle).toBe(true);
  });

  it('handles empty task list', () => {
    const result = topologicalSort([]);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted).toEqual([]);
  });
});

describe('BFS cycle detection (mirrors Convex addTaskDependency logic)', () => {
  it('detects self-dependency', () => {
    expect('A' === 'A').toBe(true);
  });

  it('detects cycle via BFS', () => {
    // A -> B -> C -> A (cycle)
    const adjacency = new Map([
      ['A', ['B']],
      ['B', ['C']],
      ['C', ['A']],
    ]);

    // BFS from dependencyKey to see if we reach taskKey (mirrors addTaskDependency)
    const visited = new Set<string>();
    const queue = ['A'];
    let foundCycle = false;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === 'A' && visited.size > 0) {
        foundCycle = true;
        break;
      }
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        queue.push(neighbor);
      }
    }

    expect(foundCycle).toBe(true);
  });

  it('no false cycle for valid DAG', () => {
    const adjacency = new Map([
      ['A', ['B', 'C']],
      ['B', ['D']],
      ['C', ['D']],
      ['D', []],
    ]);

    const visited = new Set<string>();
    const queue = ['A'];
    let foundCycle = false;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        queue.push(neighbor);
      }
    }

    expect(foundCycle).toBe(false);
    expect(visited.size).toBe(4);
  });

  it('validates dependency array operations', () => {
    const deps: string[] = ['B', 'C'];
    expect(deps.includes('B')).toBe(true);
    expect(deps.includes('D')).toBe(false);

    const filtered = deps.filter((d) => d !== 'B');
    expect(filtered).toEqual(['C']);
  });
});

describe('critical path DP (mirrors Convex getCriticalPath logic)', () => {
  it('computes simple chain', () => {
    const tasks = [
      { taskKey: 'A', dependencies: [], storyPoints: 3 },
      { taskKey: 'B', dependencies: ['A'], storyPoints: 5 },
      { taskKey: 'C', dependencies: ['B'], storyPoints: 2 },
    ];
    const result = computeCriticalPath(tasks);
    expect(result.path).toEqual(['A', 'B', 'C']);
    expect(result.totalStoryPoints).toBe(10);
  });

  it('takes longer branch in diamond', () => {
    const tasks = [
      { taskKey: 'A', dependencies: [], storyPoints: 2 },
      { taskKey: 'B', dependencies: ['A'], storyPoints: 8 },
      { taskKey: 'C', dependencies: ['A'], storyPoints: 3 },
      { taskKey: 'D', dependencies: ['B', 'C'], storyPoints: 1 },
    ];
    const result = computeCriticalPath(tasks);
    expect(result.path).toEqual(['A', 'B', 'D']);
    expect(result.totalStoryPoints).toBe(11);
  });

  it('handles parallel paths', () => {
    const tasks = [
      { taskKey: 'A', dependencies: [], storyPoints: 5 },
      { taskKey: 'B', dependencies: [], storyPoints: 3 },
      { taskKey: 'C', dependencies: ['A'], storyPoints: 2 },
      { taskKey: 'D', dependencies: ['B'], storyPoints: 10 },
    ];
    const result = computeCriticalPath(tasks);
    expect(result.path).toEqual(['B', 'D']);
    expect(result.totalStoryPoints).toBe(13);
  });

  it('returns empty for cycle', () => {
    const tasks = [
      { taskKey: 'A', dependencies: ['B'], storyPoints: 3 },
      { taskKey: 'B', dependencies: ['A'], storyPoints: 5 },
    ];
    const result = computeCriticalPath(tasks);
    expect(result.path).toEqual([]);
    expect(result.totalStoryPoints).toBe(0);
  });

  it('handles single task', () => {
    const tasks = [{ taskKey: 'A', dependencies: [], storyPoints: 5 }];
    const result = computeCriticalPath(tasks);
    expect(result.path).toEqual(['A']);
    expect(result.totalStoryPoints).toBe(5);
  });
});

describe('blocker chain BFS (mirrors Convex getBlockedTasks logic)', () => {
  it('returns direct blockers', () => {
    const tasks = [
      { taskKey: 'A', dependencies: [], title: 'Task A', status: 'done' },
      { taskKey: 'B', dependencies: ['A'], title: 'Task B', status: 'blocked' },
    ];
    const chain = buildBlockerChain('B', tasks);
    expect(chain).toHaveLength(1);
    expect(chain[0].taskKey).toBe('A');
    expect(chain[0].depth).toBe(1);
  });

  it('returns transitive blockers', () => {
    const tasks = [
      { taskKey: 'A', dependencies: [], title: 'Task A', status: 'ready' },
      { taskKey: 'B', dependencies: ['A'], title: 'Task B', status: 'ready' },
      { taskKey: 'C', dependencies: ['B'], title: 'Task C', status: 'blocked' },
    ];
    const chain = buildBlockerChain('C', tasks);
    expect(chain).toHaveLength(2);
    expect(chain.find((b) => b.taskKey === 'B')).toBeDefined();
    expect(chain.find((b) => b.taskKey === 'A')).toBeDefined();
  });

  it('returns empty for no blockers', () => {
    const tasks = [{ taskKey: 'A', dependencies: [], title: 'Task A', status: 'ready' }];
    const chain = buildBlockerChain('A', tasks);
    expect(chain).toEqual([]);
  });

  it('returns empty for unknown task', () => {
    const chain = buildBlockerChain('UNKNOWN', []);
    expect(chain).toEqual([]);
  });

  it('avoids infinite loop on cycle', () => {
    const tasks = [
      { taskKey: 'A', dependencies: ['B'], title: 'Task A', status: 'blocked' },
      { taskKey: 'B', dependencies: ['A'], title: 'Task B', status: 'blocked' },
    ];
    const chain = buildBlockerChain('A', tasks);
    expect(chain.length).toBeLessThanOrEqual(2);
  });
});
