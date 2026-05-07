import { readFileSync, readdirSync } from 'fs';
import { join, basename, parse as parsePath } from 'path';

export interface AgentPrompt {
  name: string;
  description: string;
  mode: string;
  model: string;
  temperature: number;
  tools: {
    write: boolean;
    edit: boolean;
    bash: boolean;
  };
  prompt: string;
}

function parseMarkdownPrompt(filePath: string): AgentPrompt {
  const content = readFileSync(filePath, 'utf-8');
  const fileName = basename(filePath, '.md');

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    throw new Error(`Invalid prompt format in ${filePath}`);
  }

  const [, frontmatter, promptText] = frontmatterMatch;
  const meta: Record<string, string | boolean | number> = {};

  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();

    if (value === 'true') meta[key] = true;
    else if (value === 'false') meta[key] = false;
    else if (!isNaN(Number(value)) && key === 'temperature') meta[key] = Number(value);
    else meta[key] = value;
  }

  return {
    name: fileName,
    description: (meta.description as string) ?? '',
    mode: (meta.mode as string) ?? 'agent',
    model: (meta.model as string) ?? 'volcengine-coding/minimax-m2.7',
    temperature: (meta.temperature as number) ?? 0.3,
    tools: {
      write: (meta.write as boolean) ?? false,
      edit: (meta.edit as boolean) ?? false,
      bash: (meta.bash as boolean) ?? false,
    },
    prompt: promptText.trim(),
  };
}

const PROMPTS_DIR = join(__dirname);

export function loadAgentPrompts(): AgentPrompt[] {
  const files = readdirSync(PROMPTS_DIR).filter((f) => f.endsWith('.md') && f !== 'index.md');
  return files.map((f) => parseMarkdownPrompt(join(PROMPTS_DIR, f)));
}

export function getAgentPrompt(name: string): AgentPrompt | undefined {
  try {
    return parseMarkdownPrompt(join(PROMPTS_DIR, `${name}.md`));
  } catch {
    return undefined;
  }
}

export const architectPrompt = getAgentPrompt('architect');
export const executorPrompt = getAgentPrompt('executor');
export const reviewerPrompt = getAgentPrompt('reviewer');
export const recoveryPrompt = getAgentPrompt('recovery');
