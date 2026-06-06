import type { Task } from './types';

export interface CycleDetectionResult {
  hasCycle: boolean;
  cyclePath?: string[];
}

/**
 * Detect whether adding a dependency from `taskKey` to `dependencyKey` would create a cycle.
 * Uses DFS from dependencyKey back to taskKey on the existing edge set.
 */
export function detectCycle(
  taskKey: string,
  dependencyKey: string,
  existingEdges: Map<string, string[]>,
): CycleDetectionResult {
  if (taskKey === dependencyKey) {
    return { hasCycle: true, cyclePath: [taskKey, dependencyKey] };
  }

  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(current: string): boolean {
    if (current === taskKey) {
      path.push(current);
      return true;
    }
    if (visited.has(current)) return false;
    visited.add(current);
    path.push(current);

    const deps = existingEdges.get(current) ?? [];
    for (const dep of deps) {
      if (dfs(dep)) return true;
    }
    path.pop();
    return false;
  }

  if (dfs(dependencyKey)) {
    return { hasCycle: true, cyclePath: path };
  }
  return { hasCycle: false };
}

export interface TopoSortResult {
  sorted: string[];
  hasCycle: boolean;
  cycleMembers?: string[];
}

/**
 * Topological sort of tasks by dependencies (Kahn's algorithm).
 * Returns sorted task keys or detects a cycle.
 */
export function topologicalSort(tasks: Task[]): TopoSortResult {
  const taskMap = new Map<string, Task>();
  for (const t of tasks) {
    taskMap.set(t.taskKey, t);
  }

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

  if (sorted.length !== tasks.length) {
    const sortedSet = new Set(sorted);
    const cycleMembers = tasks.filter((t) => !sortedSet.has(t.taskKey)).map((t) => t.taskKey);
    return { sorted: [], hasCycle: true, cycleMembers };
  }

  return { sorted, hasCycle: false };
}

export interface CriticalPathResult {
  path: string[];
  totalStoryPoints: number;
  length: number;
}

/**
 * Compute the true critical path (longest weighted path) through the task DAG.
 * Uses story points as weights. Returns the longest path and its total story points.
 */
export function computeCriticalPath(tasks: Task[]): CriticalPathResult {
  const taskMap = new Map<string, Task>();
  for (const t of tasks) {
    taskMap.set(t.taskKey, t);
  }

  const topo = topologicalSort(tasks);
  if (topo.hasCycle) {
    return { path: [], totalStoryPoints: 0, length: 0 };
  }

  // Dynamic programming: dist[v] = longest weighted path ending at v
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  // Initialize: each task starts with its own story points
  for (const key of topo.sorted) {
    const task = taskMap.get(key);
    const sp = task?.storyPoints ?? 1;
    dist.set(key, sp);
    prev.set(key, null);
  }

  // Process in topological order — iterate edges, not all pairs
  for (const v of topo.sorted) {
    const vTask = taskMap.get(v);
    if (!vTask) continue;
    const vsp = vTask.storyPoints ?? 1;
    for (const u of vTask.dependencies) {
      if (!taskMap.has(u)) continue;
      const candidate = (dist.get(u) ?? 0) + vsp;
      if (candidate > (dist.get(v) ?? 0)) {
        dist.set(v, candidate);
        prev.set(v, u);
      }
    }
  }

  // Find the endpoint of the longest path
  let maxDist = 0;
  let endKey: string | null = null;
  for (const [key, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      endKey = key;
    }
  }

  if (!endKey) {
    return { path: [], totalStoryPoints: 0, length: 0 };
  }

  // Reconstruct path
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

export interface BlockerEntry {
  taskKey: string;
  title: string;
  status: string;
  depth: number;
}

/**
 * Get the transitive closure of blockers for a given task.
 * Returns all tasks that directly or transitively block the given task.
 */
export function getBlockedChain(taskKey: string, allTasks: Task[]): BlockerEntry[] {
  const taskMap = new Map<string, Task>();
  for (const t of allTasks) {
    taskMap.set(t.taskKey, t);
  }

  const task = taskMap.get(taskKey);
  if (!task) return [];

  const chain: BlockerEntry[] = [];
  const visited = new Set<string>();
  const queue: Array<{ key: string; depth: number }> = [];

  for (const dep of task.dependencies) {
    queue.push({ key: dep, depth: 1 });
  }

  while (queue.length > 0) {
    const { key, depth } = queue.shift()!;
    if (visited.has(key)) continue;
    visited.add(key);

    const depTask = taskMap.get(key);
    if (!depTask) continue;

    chain.push({
      taskKey: key,
      title: depTask.title,
      status: depTask.status,
      depth,
    });

    for (const transitiveDep of depTask.dependencies) {
      if (!visited.has(transitiveDep)) {
        queue.push({ key: transitiveDep, depth: depth + 1 });
      }
    }
  }

  return chain;
}

/**
 * Estimate time to unblock a task based on blocker chain and agent throughput.
 * Returns estimated minutes until the task can begin work.
 */
export function estimateUnblockTime(
  blockedTask: Task,
  allTasks: Task[],
  agentThroughputPointsPerHour: number = 2,
): number {
  const chain = getBlockedChain(blockedTask.taskKey, allTasks);
  const incompleteBlockers = chain.filter((b) => b.status !== 'done');

  if (incompleteBlockers.length === 0) return 0;

  const taskMap = new Map<string, Task>();
  for (const t of allTasks) {
    taskMap.set(t.taskKey, t);
  }

  // Compute longest weighted path through incomplete blockers using DP.
  // Each incomplete blocker's story points are the node weight; we need the
  // path with maximum total weight (the blocker chain that takes the longest).
  const incompleteKeys = new Set(incompleteBlockers.map((b) => b.taskKey));
  const memo = new Map<string, number>();

  function longestPathFrom(key: string): number {
    if (memo.has(key)) return memo.get(key)!;
    const t = taskMap.get(key);
    if (!t || !incompleteKeys.has(key)) {
      memo.set(key, 0);
      return 0;
    }
    let bestChild = 0;
    for (const dep of t.dependencies) {
      bestChild = Math.max(bestChild, longestPathFrom(dep));
    }
    const result = (t.storyPoints ?? 1) + bestChild;
    memo.set(key, result);
    return result;
  }

  let longestChainPoints = 0;
  for (const b of incompleteBlockers) {
    longestChainPoints = Math.max(longestChainPoints, longestPathFrom(b.taskKey));
  }

  if (agentThroughputPointsPerHour <= 0) return Infinity;
  return Math.round((longestChainPoints / agentThroughputPointsPerHour) * 60);
}

/**
 * Compute the makespan for a sprint: the critical path (longest weighted
 * dependency path) across all connected components in the sprint task graph.
 *
 * Formula: makespan = max over each connected component C of
 *          computeCriticalPath(C).totalStoryPoints
 *
 * External dependencies (not in the task set) are treated as already done.
 */
export function estimateSprintMakespan(tasks: Task[]): number {
  if (tasks.length === 0) return 0;

  const taskMap = new Map<string, Task>();
  for (const t of tasks) {
    taskMap.set(t.taskKey, t);
  }

  // Find connected components via BFS/DFS
  const visited = new Set<string>();
  const components: Task[][] = [];

  for (const t of tasks) {
    if (visited.has(t.taskKey)) continue;
    // BFS to find all tasks in this component
    const component: Task[] = [];
    const queue = [t.taskKey];
    while (queue.length > 0) {
      const key = queue.shift()!;
      if (visited.has(key)) continue;
      visited.add(key);
      const task = taskMap.get(key);
      if (!task) continue;
      component.push(task);
      // Follow dependencies (only within sprint)
      for (const dep of task.dependencies) {
        if (!visited.has(dep) && taskMap.has(dep)) {
          queue.push(dep);
        }
      }
      // Follow reverse dependencies (tasks that depend on this one)
      for (const other of tasks) {
        if (!visited.has(other.taskKey) && other.dependencies.includes(key)) {
          queue.push(other.taskKey);
        }
      }
    }
    components.push(component);
  }

  // Compute critical path for each component, return the max
  let maxMakespan = 0;
  for (const component of components) {
    const result = computeCriticalPath(component);
    if (result.totalStoryPoints > maxMakespan) {
      maxMakespan = result.totalStoryPoints;
    }
  }

  return maxMakespan;
}
