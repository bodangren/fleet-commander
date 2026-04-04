import { runLocalCommandAndPersist } from './localWorker';

const [, , projectSlug = 'kanban-conductor', trackId = 'platform_pivot_bun_convex_20260401'] =
  process.argv;

await runLocalCommandAndPersist({
  projectSlug,
  trackId,
  runId: `demo-${Date.now()}`,
  command: ['bash', '-lc', 'echo bun-local-worker-demo'],
});

console.log('demo run persisted');
