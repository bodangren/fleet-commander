import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function loadOpencodeConfig() {
  const configPath = join(homedir(), '.config', 'opencode', 'opencode.json');
  try {
    const content = readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function main() {
  const client = createConvexClient();
  const config = loadOpencodeConfig();
  
  if (!config?.provider) {
    console.log('No providers found in opencode config');
    return;
  }

  console.log(`Syncing ${Object.keys(config.provider).length} providers from opencode config...`);
  
  for (const [name, providerConfig] of Object.entries(config.provider)) {
    try {
      const pc = providerConfig as any;
      await client.mutation(api.fleetCatalog.upsertHarness, {
        name,
        commandTemplate: `${name}`,
        discoveryCommand: `${name} models`,
        source: 'import',
      });
      console.log(`  Synced: ${name} (${pc.name || name})`);
    } catch (err) {
      console.error(`  Failed: ${name} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  console.log('Done.');
}

await main();
