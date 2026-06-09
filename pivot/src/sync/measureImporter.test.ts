import { describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  tshirtToPoints,
  storyPriorityToPriority,
  parseTasksFromPlan,
  parseStoriesFromSpec,
  parseTrackTasks,
  collectProjectImport,
} from './measureImporter';

describe('tshirtToPoints', () => {
  test('maps T-shirt sizes to points', () => {
    expect(tshirtToPoints('S')).toBe(1);
    expect(tshirtToPoints('M')).toBe(3);
    expect(tshirtToPoints('L')).toBe(5);
    expect(tshirtToPoints('XL')).toBe(8);
  });

  test('is case-insensitive and defaults unknown sizes to 0', () => {
    expect(tshirtToPoints('m')).toBe(3);
    expect(tshirtToPoints('XXL')).toBe(0);
    expect(tshirtToPoints('')).toBe(0);
  });
});

describe('storyPriorityToPriority', () => {
  test('maps MoSCoW to priority enum', () => {
    expect(storyPriorityToPriority('Must')).toBe('high');
    expect(storyPriorityToPriority('Should')).toBe('medium');
    expect(storyPriorityToPriority('Could')).toBe('low');
  });

  test('is case-insensitive and defaults to medium', () => {
    expect(storyPriorityToPriority('must')).toBe('high');
    expect(storyPriorityToPriority('Won\'t')).toBe('medium');
    expect(storyPriorityToPriority('')).toBe('medium');
  });
});

describe('parseTasksFromPlan', () => {
  const plan = [
    '# Plan',
    '',
    '- [ ] First task',
    '  - [ ] nested ignored',
    '- [x] Done task',
    '- [~] In progress task',
  ].join('\n');

  test('parses only top-level checkbox items', () => {
    const tasks = parseTasksFromPlan(plan, 'trk');
    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({ taskKey: 'trk-task-1', title: 'First task', status: 'backlog' });
    expect(tasks[1]).toMatchObject({ taskKey: 'trk-task-2', title: 'Done task', status: 'done' });
    expect(tasks[2]).toMatchObject({ taskKey: 'trk-task-3', title: 'In progress task', status: 'in_progress' });
  });

  test('plan tasks default to medium priority and zero points', () => {
    const tasks = parseTasksFromPlan(plan, 'trk');
    expect(tasks[0].priority).toBe('medium');
    expect(tasks[0].storyPoints).toBe(0);
  });
});

describe('parseStoriesFromSpec', () => {
  const spec = [
    '# Feature',
    'Status: new',
    '',
    '## Stories',
    '',
    '### Story 1: Search the catalog',
    'As a shopper',
    'I want to search products',
    'So that I can find items fast',
    '',
    'Estimate: L',
    'Priority: Must',
    '',
    '### Story 2: Save favorites',
    'As a shopper I want to save favorites So that I can revisit them',
    '',
    'Estimate: S',
    'Priority: Could',
    '',
    '## Non-Goals',
    'Not this.',
  ].join('\n');

  test('parses each story with estimate and priority mapped', () => {
    const tasks = parseStoriesFromSpec(spec, 'trk');
    expect(tasks).not.toBeNull();
    expect(tasks).toHaveLength(2);
    expect(tasks![0]).toMatchObject({
      taskKey: 'trk-story-1',
      title: 'Search the catalog',
      status: 'backlog',
      priority: 'high',
      storyPoints: 5,
    });
    expect(tasks![1]).toMatchObject({
      taskKey: 'trk-story-2',
      title: 'Save favorites',
      priority: 'low',
      storyPoints: 1,
    });
  });

  test('stops at the next section heading', () => {
    const tasks = parseStoriesFromSpec(spec, 'trk');
    expect(tasks!.every((t) => t.title !== 'Non-Goals')).toBe(true);
  });

  test('returns null when there is no Stories section', () => {
    expect(parseStoriesFromSpec('# Feature\n\n## Requirements\n- FR1', 'trk')).toBeNull();
  });
});

describe('parseTrackTasks', () => {
  test('prefers stories when present', () => {
    const spec = '# F\n## Stories\n### Story 1: A\nEstimate: M\nPriority: Should';
    const plan = '- [ ] Plan task';
    const tasks = parseTrackTasks(spec, plan, 'trk');
    expect(tasks[0].taskKey).toBe('trk-story-1');
  });

  test('falls back to plan tasks when no stories', () => {
    const spec = '# F\n## Requirements\n- FR1';
    const plan = '- [ ] Plan task';
    const tasks = parseTrackTasks(spec, plan, 'trk');
    expect(tasks[0].taskKey).toBe('trk-task-1');
  });
});

describe('collectProjectImport', () => {
  test('reads tracks and tasks from a workspace measure dir', () => {
    const root = mkdtempSync(join(tmpdir(), 'fc-import-'));
    try {
      const trackDir = join(root, 'measure', 'tracks', 'my_track_20260101');
      mkdirSync(trackDir, { recursive: true });
      writeFileSync(
        join(trackDir, 'spec.md'),
        '# My Track\nStatus: active\n\n## Requirements\n- FR1',
      );
      writeFileSync(join(trackDir, 'plan.md'), '- [ ] Task one\n- [x] Task two');

      const result = collectProjectImport(root);
      expect(result.slug).toBe(result.name);
      expect(result.tracks).toHaveLength(1);
      const track = result.tracks[0];
      expect(track.trackId).toBe('my_track_20260101');
      expect(track.snapshot.title).toBe('My Track');
      expect(track.snapshot.status).toBe('active');
      expect(track.tasks).toHaveLength(2);
      expect(track.tasks[1].status).toBe('done');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('returns no tracks when the workspace has no measure/tracks dir', () => {
    const root = mkdtempSync(join(tmpdir(), 'fc-import-empty-'));
    try {
      expect(collectProjectImport(root).tracks).toHaveLength(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
