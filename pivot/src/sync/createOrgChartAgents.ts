import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';

const AGENTS_DIR = '/home/daniel-bo/Desktop/fleet-commander/measure/agents';

// Org chart agents with their role categories
const ORG_CHART_AGENTS = [
  {
    name: 'cto-principal-engineer',
    category: 'Leadership',
    displayName: 'CTO / Principal Engineer',
    model: 'deepseek/deepseek-v4-pro',
    mode: 'agent',
    temperature: 0.2,
    tools: { write: true, edit: true, bash: true },
  },
  {
    name: 'engineering-manager',
    category: 'Leadership',
    displayName: 'Engineering Manager / PM',
    model: 'opencode-go/glm-5.1',
    mode: 'subagent',
    temperature: 0.3,
    tools: { write: false, edit: false, bash: false },
  },
  {
    name: 'product-marketing-manager',
    category: 'Leadership',
    displayName: 'Product / Marketing Manager',
    model: 'opencode-go/qwen3.5-plus',
    mode: 'subagent',
    temperature: 0.4,
    tools: { write: false, edit: false, bash: false },
  },
  {
    name: 'backend-lead',
    category: 'Engineering',
    displayName: 'Backend Lead',
    model: 'kimi-for-coding/k2p6',
    mode: 'agent',
    temperature: 0.2,
    tools: { write: true, edit: true, bash: true },
  },
  {
    name: 'frontend-lead',
    category: 'Engineering',
    displayName: 'Frontend Lead',
    model: 'opencode-go/mimo-v2-omni',
    mode: 'agent',
    temperature: 0.2,
    tools: { write: true, edit: true, bash: false },
  },
  {
    name: 'data-engineer',
    category: 'Engineering',
    displayName: 'Data Engineer / DBA',
    model: 'opencode-go/glm-5.1',
    mode: 'agent',
    temperature: 0.2,
    tools: { write: true, edit: true, bash: true },
  },
  {
    name: 'security-engineer',
    category: 'Engineering',
    displayName: 'Security Engineer',
    model: 'deepseek/deepseek-v4-pro',
    mode: 'subagent',
    temperature: 0.1,
    tools: { write: false, edit: true, bash: true },
  },
  {
    name: 'staff-engineer-reviewer',
    category: 'Quality',
    displayName: 'Staff Engineer / Reviewer',
    model: 'deepseek/deepseek-v4-pro',
    mode: 'subagent',
    temperature: 0.1,
    tools: { write: false, edit: true, bash: false },
  },
  {
    name: 'qa-test-engineer',
    category: 'Quality',
    displayName: 'QA / Test Engineer',
    model: 'minimax-cn-coding-plan/MiniMax-M2.7',
    mode: 'subagent',
    temperature: 0.3,
    tools: { write: false, edit: false, bash: true },
  },
  {
    name: 'devops-sre',
    category: 'Operations',
    displayName: 'DevOps / SRE',
    model: 'kimi-for-coding/k2p6',
    mode: 'agent',
    temperature: 0.2,
    tools: { write: true, edit: true, bash: true },
  },
  {
    name: 'junior-developer',
    category: 'Engineering',
    displayName: 'Junior Developer',
    model: 'minimax-cn-coding-plan/MiniMax-M2.7',
    mode: 'agent',
    temperature: 0.4,
    tools: { write: true, edit: true, bash: false },
  },
  {
    name: 'intern',
    category: 'Engineering',
    displayName: 'Intern',
    model: 'minimax-cn-coding-plan/MiniMax-M2.5-highspeed',
    mode: 'subagent',
    temperature: 0.5,
    tools: { write: false, edit: false, bash: false },
  },
  {
    name: 'technical-writer',
    category: 'Documentation',
    displayName: 'Technical Writer',
    model: 'opencode-go/qwen3.5-plus',
    mode: 'subagent',
    temperature: 0.4,
    tools: { write: true, edit: true, bash: false },
  },
];

/**
 * Main entry point for creating org chart agents in Convex.
 */
async function main() {
  const client = createConvexClient();
  console.log(`Creating ${ORG_CHART_AGENTS.length} org chart agents...`);

  for (const agent of ORG_CHART_AGENTS) {
    try {
      // Try to read the agent prompt from file
      const promptPath = join(AGENTS_DIR, `${agent.name}.md`);
      let prompt: string;
      try {
        prompt = readFileSync(promptPath, 'utf8');
      } catch {
        // Fallback prompt if file doesn't exist
        prompt = `You are the ${agent.displayName}. Follow best practices for your role and respond clearly.`;
      }

      await client.mutation(api.fleetCatalog.upsertAgent, {
        name: agent.name,
        displayName: agent.displayName,
        mode: agent.mode,
        model: agent.model,
        temperature: agent.temperature,
        prompt,
        toolsJson: JSON.stringify(agent.tools),
        source: 'import',
      });
      console.log(`  Created: ${agent.name} (${agent.category})`);
    } catch (err) {
      console.error(`  Failed: ${agent.name} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('Done.');
}

await main();
