import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';
import { api } from '../../../convex/_generated/api';

export function registerDependencyRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/projects/:projectSlug/dependencies', async (_req, params) => {
    const tasks = (await client.query(api.fleetCatalog.listTasksByProject, {
      projectSlug: params.projectSlug,
    })) as Array<{
      taskKey: string;
      title: string;
      status: string;
      dependencies: string[];
    }>;

    const edges: Array<{ from: string; to: string }> = [];
    for (const task of tasks) {
      for (const dep of task.dependencies) {
        edges.push({ from: dep, to: task.taskKey });
      }
    }

    return json({ nodes: tasks.map((t) => ({ key: t.taskKey, title: t.title, status: t.status })), edges });
  });

  router.get('/api/projects/:projectSlug/critical-path', async (_req, params) => {
    const tasks = (await client.query(api.fleetCatalog.listTasksByProject, {
      projectSlug: params.projectSlug,
    })) as Array<{
      taskKey: string;
      title: string;
      status: string;
      dependencies: string[];
    }>;

    // Build adjacency and compute longest path (critical path)
    const taskMap = new Map(tasks.map((t) => [t.taskKey, t]));
    const memo = new Map<string, number>();

    function longestPath(key: string): number {
      if (memo.has(key)) return memo.get(key)!;
      const task = taskMap.get(key);
      if (!task || task.dependencies.length === 0) {
        memo.set(key, 1);
        return 1;
      }
      const max = 1 + Math.max(...task.dependencies.map(longestPath));
      memo.set(key, max);
      return max;
    }

    let criticalPath: string[] = [];
    let maxLen = 0;
    for (const task of tasks) {
      const len = longestPath(task.taskKey);
      if (len > maxLen) {
        maxLen = len;
        // Reconstruct path
        const path: string[] = [task.taskKey];
        let current = task;
        while (current.dependencies.length > 0) {
          const nextKey = current.dependencies.reduce((best, dep) =>
            (memo.get(dep) ?? 0) > (memo.get(best) ?? 0) ? dep : best,
          );
          path.unshift(nextKey);
          current = taskMap.get(nextKey)!;
        }
        criticalPath = path;
      }
    }

    return json({ criticalPath, length: maxLen });
  });
}
