import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';

/**
 * Providers the org-chart agents are assigned to. Every entry must be a
 * provider that pi-measure-harness serves a `coder-*` role for, or the Pi
 * executor backend will fail closed on any agent using it — see
 * `piBackendPreflight.ts` and ADR-004.
 *
 * `opencode-go` was removed when the agents were re-pointed for Phase 4: the
 * harness has no role for it. Upserts do not delete, so an existing
 * `opencode-go` row survives in Convex until removed by hand.
 */
const HARNESSES = [
  {
    name: 'minimax-cn-coding-plan',
    commandTemplate: 'minimax',
    discoveryCommand: 'minimax models',
    source: 'manual' as const,
  },
  {
    name: 'kimi-for-coding',
    commandTemplate: 'kimi',
    discoveryCommand: 'kimi models',
    source: 'manual' as const,
  },
  {
    name: 'deepseek',
    commandTemplate: 'deepseek',
    discoveryCommand: 'deepseek models',
    source: 'manual' as const,
  },
  {
    name: 'vocengine-coding',
    commandTemplate: 'vocengine',
    discoveryCommand: 'vocengine models',
    source: 'manual' as const,
  },
  {
    name: 'openai',
    commandTemplate: 'openai',
    discoveryCommand: 'openai models',
    source: 'manual' as const,
  },
  {
    name: 'xiaomi',
    commandTemplate: 'xiaomi',
    discoveryCommand: 'xiaomi models',
    source: 'manual' as const,
  },
];

/**
 * Main entry point for creating default harnesses in Convex.
 */
async function main() {
  const client = createConvexClient();
  console.log('Creating harnesses...');
  for (const harness of HARNESSES) {
    try {
      await client.mutation(api.fleetCatalog.upsertHarness, harness);
      console.log(`  Created: ${harness.name}`);
    } catch (err) {
      console.error(`  Failed: ${harness.name} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log('Done.');
}

if (import.meta.main) {
  await main();
}
