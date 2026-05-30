import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { loadAgentPrompts } from '../agents/index';

/**
 * Print usage instructions and exit.
 * @returns Never returns (always throws)
 */
function usage(): never {
  throw new Error('Usage: bun src/sync/convexAgentSync.ts <sync|dry-run>');
}

/**
 * Sync agents from local prompts to Convex.
 * @param dryRun - If true, only log what would be done without making changes
 */
async function syncAgents(dryRun: boolean) {
  const client = createConvexClient();
  const prompts = loadAgentPrompts();

  console.log(`Found ${prompts.length} agent prompts to sync`);
  for (const prompt of prompts) {
    const agent = {
      name: prompt.name,
      displayName: prompt.description,
      mode: prompt.mode,
      model: prompt.model,
      temperature: prompt.temperature,
      prompt: prompt.prompt,
      toolsJson: JSON.stringify(prompt.tools),
      source: 'import' as const,
    };

    if (dryRun) {
      console.log(`[dry-run] Would upsert agent: ${agent.name}`);
      console.log(`  displayName: ${agent.displayName}`);
      console.log(`  mode: ${agent.mode}, model: ${agent.model}, temperature: ${agent.temperature}`);
      console.log(`  tools: ${agent.toolsJson}`);
      console.log(`  prompt (${agent.prompt.length} chars): ${agent.prompt.slice(0, 80)}...`);
    } else {
      console.log(`Upserting agent: ${agent.name}`);
      await client.mutation(api.fleetCatalog.upsertAgent, agent);
    }
  }

  console.log(dryRun ? 'Dry run complete' : `Synced ${prompts.length} agents to Convex`);
}

/**
 * Main entry point for the convexAgentSync CLI.
 */
async function main() {
  const [, , command] = process.argv;
  if (!command) usage();

  if (command === 'sync' || command === 'dry-run') {
    await syncAgents(command === 'dry-run');
    return;
  }

  usage();
}

await main();