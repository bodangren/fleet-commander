import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';

const AGENT_UPDATES = [
  {
    name: 'architect',
    displayName: 'CTO / Principal Engineer — Designs system architecture and breaks down complex tasks',
    description: 'System architect that designs architecture, creates implementation plans, and decomposes work into phases and tasks',
  },
  {
    name: 'executor',
    displayName: 'Senior Developer — Implements tasks and writes code',
    description: 'Senior developer that implements tasks according to specifications, writes code, and reports results',
  },
  {
    name: 'reviewer',
    displayName: 'Staff Engineer / Code Reviewer — Reviews implementation quality',
    description: 'Staff engineer that reviews implementations against specifications, catches bugs, and ensures quality',
  },
  {
    name: 'recovery',
    displayName: 'Engineering Manager — Handles failures and decides recovery actions',
    description: 'Engineering manager that analyzes task failures and determines appropriate recovery actions (retry, escalate, split, replan)',
  },
  {
    name: 'retrospective',
    displayName: 'Technical Writer — Generates sprint retrospectives and reports',
    description: 'Technical writer that analyzes sprint data and generates structured retrospective reports with patterns and improvement suggestions',
  },
];

async function main() {
  const client = createConvexClient();
  console.log('Updating agent display names...');
  for (const update of AGENT_UPDATES) {
    try {
      const agent = await client.query(api.fleetCatalog.getAgentByName, {
        name: update.name,
      });
      if (!agent) {
        console.log(`  Agent not found: ${update.name}`);
        continue;
      }
      await client.mutation(api.fleetCatalog.upsertAgent, {
        name: update.name,
        displayName: update.displayName,
        mode: agent.mode,
        model: agent.model,
        temperature: agent.temperature,
        prompt: agent.prompt,
        toolsJson: agent.toolsJson,
        source: agent.source,
      });
      console.log(`  Updated: ${update.name}`);
    } catch (err) {
      console.error(`  Failed: ${update.name} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log('Done.');
}

await main();
