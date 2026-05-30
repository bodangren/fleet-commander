/**
 * CLI entrypoint for the Bun orchestrator.
 *
 * Usage:
 *   bun src/orchestrator/run.ts              # Run auto-runner loop
 *   bun src/orchestrator/run.ts once          # Run a single cycle and exit
 *   bun src/orchestrator/run.ts once <slug>   # Run a single cycle for a specific project
 */
import { runAllProjects, runProject } from './orchestrator';
import { createConvexClient } from '../convexClient';
import { runAutoRunner } from './autoRunner';

const mode = process.argv[2] ?? 'loop';

/**
 * Runs a single orchestrator cycle for all active projects or a specific project by slug.
 */
async function runOnce(projectSlug?: string): Promise<void> {
  const client = createConvexClient();

  if (projectSlug) {
    const result = await runProject(client, projectSlug);
    console.log(JSON.stringify(result, null, 2));
  } else {
    const results = await runAllProjects();
    console.log(JSON.stringify(results, null, 2));
  }
}

if (mode === 'once') {
  const slug = process.argv[3];
  runOnce(slug).catch((err: unknown) => {
    console.error('Orchestrator error:', err);
    process.exit(1);
  });
} else {
  runAutoRunner().catch((err: unknown) => {
    console.error('AutoRunner error:', err);
    process.exit(1);
  });
}
