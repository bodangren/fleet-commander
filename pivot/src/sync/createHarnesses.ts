import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';

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
    name: 'opencode-go',
    commandTemplate: 'opencode',
    discoveryCommand: 'opencode models',
    source: 'manual' as const,
  },
];

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

await main();
