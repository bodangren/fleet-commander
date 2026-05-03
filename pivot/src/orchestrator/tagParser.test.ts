import { describe, expect, it } from 'bun:test';
import { parseTaskLine, parsePlanTags } from './tagParser';

describe('parseTaskLine', () => {
  it('parses pending task with no tags', () => {
    const result = parseTaskLine('- [ ] Build the component');
    expect(result).toEqual({
      status: 'pending',
      title: 'Build the component',
      tags: {},
    });
  });

  it('parses done task', () => {
    const result = parseTaskLine('- [x] Completed task');
    expect(result?.status).toBe('done');
  });

  it('parses in-progress task', () => {
    const result = parseTaskLine('- [~] Working on it');
    expect(result?.status).toBe('in_progress');
  });

  it('parses assignee', () => {
    const result = parseTaskLine('- [ ] @frontend Build component');
    expect(result?.assignee).toBe('frontend');
    expect(result?.title).toBe('Build component');
  });

  it('parses tags', () => {
    const result = parseTaskLine('- [ ] Build component #priority:high #blocked_by:task-42');
    expect(result?.tags).toEqual({
      priority: 'high',
      blocked_by: 'task-42',
    });
    expect(result?.title).toBe('Build component');
  });

  it('parses assignee and tags together', () => {
    const result = parseTaskLine('- [ ] @backend Fix API #priority:critical #persona:senior');
    expect(result?.assignee).toBe('backend');
    expect(result?.title).toBe('Fix API');
    expect(result?.tags).toEqual({
      priority: 'critical',
      persona: 'senior',
    });
  });

  it('handles tag with hyphens in key', () => {
    const result = parseTaskLine('- [ ] Task #blocked-by:task-1');
    expect(result?.tags).toEqual({ 'blocked-by': 'task-1' });
  });

  it('returns null for non-task lines', () => {
    expect(parseTaskLine('## Phase 1: Setup')).toBeNull();
    expect(parseTaskLine('Some text')).toBeNull();
    expect(parseTaskLine('')).toBeNull();
  });

  it('handles empty title with tags', () => {
    const result = parseTaskLine('- [ ] #priority:low');
    expect(result?.title).toBe('');
    expect(result?.tags).toEqual({ priority: 'low' });
  });

  it('handles complex tag values', () => {
    const result = parseTaskLine('- [ ] Task #depends:a1_b2-c3');
    expect(result?.tags).toEqual({ depends: 'a1_b2-c3' });
  });
});

describe('parsePlanTags', () => {
  it('parses multiple tasks from plan markdown', () => {
    const plan = `# Plan

## Phase 1
- [ ] @frontend Build UI #priority:high
- [ ] @backend API endpoint #priority:medium

## Phase 2
- [x] Setup tests #persona:qa
`;
    const tasks = parsePlanTags(plan);
    expect(tasks).toHaveLength(3);
    expect(tasks[0].assignee).toBe('frontend');
    expect(tasks[0].tags.priority).toBe('high');
    expect(tasks[1].assignee).toBe('backend');
    expect(tasks[2].status).toBe('done');
  });

  it('ignores non-task lines', () => {
    const plan = `# Heading
Some description text
- [ ] Actual task
More text`;
    const tasks = parsePlanTags(plan);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Actual task');
  });
});
