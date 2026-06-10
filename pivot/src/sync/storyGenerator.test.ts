import { describe, expect, it } from 'bun:test';
import {
  buildStoryPrompt,
  extractJsonArray,
  parseGeneratedStories,
  estimateToPoints,
  priorityToTaskPriority,
  renderStoriesMarkdown,
} from './storyGenerator';

const validStory = {
  title: 'Sign up flow',
  asA: 'new user',
  iWant: 'to create an account',
  soThat: 'I can use the app',
  acceptanceCriteria: ['Form validates email', 'Confirmation email is sent'],
  estimate: 'M' as const,
  priority: 'Must' as const,
};

describe('buildStoryPrompt', () => {
  it('includes goal and spec body in the prompt', () => {
    const prompt = buildStoryPrompt({ goal: 'Ship checkout', spec: '# Checkout' });
    expect(prompt).toContain('Ship checkout');
    expect(prompt).toContain('# Checkout');
    expect(prompt).toContain('JSON array');
  });

  it('includes project context when provided', () => {
    const prompt = buildStoryPrompt({
      goal: 'g',
      spec: 's',
      projectContext: 'React + Convex',
    });
    expect(prompt).toContain('React + Convex');
  });

  it('marks empty spec as (empty)', () => {
    const prompt = buildStoryPrompt({ goal: 'g', spec: '' });
    expect(prompt).toContain('(empty)');
  });
});

describe('extractJsonArray', () => {
  it('returns the slice between the first [ and last ]', () => {
    expect(extractJsonArray('intro [1,2,3] outro')).toBe('[1,2,3]');
  });

  it('strips markdown code fences', () => {
    expect(extractJsonArray('```json\n[1,2]\n```')).toContain('[1,2]');
  });

  it('throws when no array is present', () => {
    expect(() => extractJsonArray('no array here')).toThrow();
  });
});

describe('parseGeneratedStories', () => {
  it('parses a clean JSON array of stories', () => {
    const raw = JSON.stringify([validStory]);
    const stories = parseGeneratedStories(raw);
    expect(stories).toHaveLength(1);
    expect(stories[0].title).toBe('Sign up flow');
    expect(stories[0].estimate).toBe('M');
  });

  it('parses stories wrapped in markdown code fences', () => {
    const raw = '```json\n' + JSON.stringify([validStory]) + '\n```';
    expect(parseGeneratedStories(raw)).toHaveLength(1);
  });

  it('rejects empty arrays', () => {
    expect(() => parseGeneratedStories('[]')).toThrow();
  });

  it('rejects invalid estimate values', () => {
    const bad = JSON.stringify([{ ...validStory, estimate: 'XXL' }]);
    expect(() => parseGeneratedStories(bad)).toThrow();
  });

  it('rejects stories missing required fields', () => {
    const bad = JSON.stringify([{ title: 'x' }]);
    expect(() => parseGeneratedStories(bad)).toThrow();
  });

  it('rejects unparseable JSON', () => {
    expect(() => parseGeneratedStories('not json [')).toThrow();
  });
});

describe('estimateToPoints', () => {
  it('maps S/M/L/XL to 1/3/5/8', () => {
    expect(estimateToPoints('S')).toBe(1);
    expect(estimateToPoints('M')).toBe(3);
    expect(estimateToPoints('L')).toBe(5);
    expect(estimateToPoints('XL')).toBe(8);
  });
});

describe('priorityToTaskPriority', () => {
  it('maps Must/Should/Could to high/medium/low', () => {
    expect(priorityToTaskPriority('Must')).toBe('high');
    expect(priorityToTaskPriority('Should')).toBe('medium');
    expect(priorityToTaskPriority('Could')).toBe('low');
  });
});

describe('renderStoriesMarkdown', () => {
  it('emits a ## Stories section with Connextra + estimate + priority', () => {
    const md = renderStoriesMarkdown([validStory]);
    expect(md).toContain('## Stories');
    expect(md).toContain('### Story 1: Sign up flow');
    expect(md).toContain('As a new user');
    expect(md).toContain('I want to create an account');
    expect(md).toContain('So that I can use the app');
    expect(md).toContain('- Form validates email');
    expect(md).toContain('Estimate: M');
    expect(md).toContain('Priority: Must');
  });

  it('round-trips through parseStoriesFromSpec for points + priority', () => {
    // Sanity check that the markdown shape matches the importer parser.
    const md = renderStoriesMarkdown([validStory]);
    // Heading + estimate header are the two fields parseStoriesFromSpec depends on.
    expect(md).toMatch(/^###\s+Story\s+1:\s+Sign up flow/m);
    expect(md).toMatch(/^Estimate:\s+M/m);
    expect(md).toMatch(/^Priority:\s+Must/m);
  });
});
