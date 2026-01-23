import { describe, it, expect } from 'vitest';
import { parsePlanFile } from '../shared/conductor';

describe('parsePlanFile', () => {
  it('parses phases and task entries', () => {
    const input = [
      '# Implementation Plan',
      '## Phase 1: Data Model [checkpoint: abc1234]',
      '- [ ] Task: Define board model',
      '- [X] Task: Add status mapping',
      '## Phase 2: Parsing',
      '- [~] Task: Parse plan files',
      '- [ ] Not a task line',
    ].join('\n');

    const phases = parsePlanFile(input);

    expect(phases).toHaveLength(2);
    expect(phases[0].title).toBe('Phase 1: Data Model');
    expect(phases[0].tasks).toHaveLength(2);
    expect(phases[0].tasks[0]).toMatchObject({
      title: 'Define board model',
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1: Data Model',
    });
    expect(phases[0].tasks[1]).toMatchObject({
      title: 'Add status mapping',
      marker: '[x]',
      status: 'done',
      phase: 'Phase 1: Data Model',
    });
    expect(phases[1].tasks).toHaveLength(1);
    expect(phases[1].tasks[0].status).toBe('in_progress');
  });

  it('parses agent tags from task titles', () => {
    const input = [
      '## Phase 1: Agents',
      '- [ ] Task: Task with agent @gemini',
      '- [ ] Task: Task with another agent @claude',
      '- [ ] Task: Task without agent',
    ].join('\n');

    const phases = parsePlanFile(input);

    expect(phases[0].tasks[0]).toMatchObject({
      title: 'Task with agent @gemini',
      agent: 'gemini',
    });
    expect(phases[0].tasks[1]).toMatchObject({
      title: 'Task with another agent @claude',
      agent: 'claude',
    });
    expect(phases[0].tasks[2].agent).toBeUndefined();
  });

  it('ignores tasks before the first phase heading', () => {
    const input = [
      '- [ ] Task: Orphaned task',
      '## Phase 1: Main',
      '- [ ] Task: Anchored task',
    ].join('\n');

    const phases = parsePlanFile(input);

    expect(phases).toHaveLength(1);
    expect(phases[0].tasks).toHaveLength(1);
    expect(phases[0].tasks[0].title).toBe('Anchored task');
  });

  it('keeps phases even when no tasks are present', () => {
    const input = [
      '# Plan',
      '## Phase 1: Empty',
      '## Phase 2: Filled',
      '- [ ] Task: Only task',
    ].join('\n');

    const phases = parsePlanFile(input);

    expect(phases).toHaveLength(2);
    expect(phases[0].tasks).toHaveLength(0);
    expect(phases[1].tasks).toHaveLength(1);
  });
});
