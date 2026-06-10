import { z } from 'zod';

/**
 * Zod schema for a single AI-generated story.
 * Matches Connextra triplet + Gherkin AC + T-shirt estimate + MoSCoW priority.
 */
export const storySchema = z.object({
  title: z.string().min(1),
  asA: z.string().min(1),
  iWant: z.string().min(1),
  soThat: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
  estimate: z.enum(['S', 'M', 'L', 'XL']),
  priority: z.enum(['Must', 'Should', 'Could']),
});

/**
 * Zod schema for the full generation payload: a non-empty array of stories.
 */
export const storiesSchema = z.array(storySchema).min(1);

export type GeneratedStory = z.infer<typeof storySchema>;

export interface StoryGeneratorInput {
  goal: string;
  spec: string;
  projectContext?: string;
}

/**
 * Build a deterministic prompt for the AI to generate sprint stories.
 * @param input - Goal, spec markdown, and optional project context
 * @returns Prompt text suitable for sendPromptToSession
 */
export function buildStoryPrompt(input: StoryGeneratorInput): string {
  const context = input.projectContext?.trim();
  return [
    'You are a product manager generating user stories for a sprint.',
    '',
    'Goal:',
    input.goal.trim(),
    '',
    'Existing spec markdown:',
    input.spec.trim() || '(empty)',
    context ? `\nProject context:\n${context}` : '',
    '',
    'Return ONLY a JSON array of stories with this shape:',
    '[{"title":"...","asA":"...","iWant":"...","soThat":"...",',
    ' "acceptanceCriteria":["..."],',
    ' "estimate":"S|M|L|XL","priority":"Must|Should|Could"}]',
    '',
    'Output the JSON array and nothing else. Do not wrap in markdown.',
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n');
}

/**
 * Extract the first JSON array substring from arbitrary LLM output.
 * Tolerates markdown code fences and leading/trailing prose.
 * @param raw - Raw text output from the LLM
 * @returns JSON array substring suitable for JSON.parse
 */
export function extractJsonArray(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenceMatch ? fenceMatch[1] : raw;
  const start = body.indexOf('[');
  const end = body.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON array found in story generator output');
  }
  return body.slice(start, end + 1);
}

/**
 * Parse and validate raw LLM output into an array of stories.
 * @param raw - Raw text output from the LLM
 * @returns Validated array of generated stories
 * @throws When the output is not parseable JSON or fails schema validation
 */
export function parseGeneratedStories(raw: string): GeneratedStory[] {
  const jsonText = extractJsonArray(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(
      `Story generator returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const result = storiesSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Story generator output failed schema validation: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Map a generated story estimate to story points (matches measureImporter).
 * @param estimate - T-shirt size (S/M/L/XL)
 * @returns Story points
 */
export function estimateToPoints(estimate: GeneratedStory['estimate']): number {
  switch (estimate) {
    case 'S':
      return 1;
    case 'M':
      return 3;
    case 'L':
      return 5;
    case 'XL':
      return 8;
  }
}

/**
 * Map a generated story priority to the task priority enum.
 * @param priority - MoSCoW priority (Must/Should/Could)
 * @returns Task priority enum value
 */
export function priorityToTaskPriority(
  priority: GeneratedStory['priority'],
): 'low' | 'medium' | 'high' {
  switch (priority) {
    case 'Must':
      return 'high';
    case 'Should':
      return 'medium';
    case 'Could':
      return 'low';
  }
}

/**
 * Render a `## Stories` markdown section from generated stories.
 * @param stories - Array of generated stories
 * @returns Markdown block starting with `## Stories`
 */
export function renderStoriesMarkdown(stories: GeneratedStory[]): string {
  const lines: string[] = ['## Stories', ''];
  stories.forEach((story, index) => {
    lines.push(`### Story ${index + 1}: ${story.title}`);
    lines.push('');
    lines.push(`As a ${story.asA}`);
    lines.push(`I want ${story.iWant}`);
    lines.push(`So that ${story.soThat}`);
    lines.push('');
    lines.push('Acceptance Criteria:');
    for (const ac of story.acceptanceCriteria) {
      lines.push(`- ${ac}`);
    }
    lines.push('');
    lines.push(`Estimate: ${story.estimate}`);
    lines.push(`Priority: ${story.priority}`);
    lines.push('');
  });
  return lines.join('\n');
}
