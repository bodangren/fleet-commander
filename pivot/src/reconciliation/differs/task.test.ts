import { describe, expect, it } from 'bun:test';
import { taskDiffer, TaskData } from './task';
import { computeMarkdownHash } from '../hash';

describe('taskDiffer', () => {
  it('detects added task when conductor has new task', () => {
    const conductorMd = `# Task 1

- [ ] Task: New task added`;

    const result = taskDiffer('project-x', 'track-1', conductorMd, null);
    expect(result).not.toBeNull();
    expect(result!.divergenceType).toBe('added');
    expect(result!.artifactId).toBe('1');
  });

  it('detects modified task when hash differs from last known', () => {
    const conductorMd = `# Task 1

- [x] Task: New task added`;

    const canonical: TaskData = {
      taskId: '1',
      status: 'backlog',
      title: 'New task added',
      lastKnownHash: 'old-hash',
    };

    const result = taskDiffer('project-x', 'track-1', conductorMd, canonical);
    expect(result).not.toBeNull();
    expect(result!.divergenceType).toBe('modified');
  });

  it('returns null when conductor hash matches canonical hash', () => {
    const md = `# Task 1

- [ ] Task: Same task`;
    const hash = computeMarkdownHash(md);

    const canonical: TaskData = {
      taskId: '1',
      status: 'backlog',
      title: 'Same task',
      lastKnownHash: hash,
    };

    const result = taskDiffer('project-x', 'track-1', md, canonical);
    expect(result).toBeNull();
  });

  it('detects modification when conductor hash differs from canonical', () => {
    const md = `# Task 1

- [ ] Task: Modified task`;
    const hash = computeMarkdownHash(md);

    const canonical: TaskData = {
      taskId: '1',
      status: 'backlog',
      title: 'Same task',
      lastKnownHash: 'different-hash',
    };

    const result = taskDiffer('project-x', 'track-1', md, canonical);
    expect(result).not.toBeNull();
    expect(result!.divergenceType).toBe('modified');
  });

  it('parses multiple tasks', () => {
    const conductorMd = `# Task 1

- [ ] Task: First task

# Task 2

- [ ] Task: Second task`;

    const result = taskDiffer('project-x', 'track-1', conductorMd, null);
    expect(result).not.toBeNull();
    expect(result!.artifactId).toBe('1');
  });

  it('handles empty conductor markdown', () => {
    const result = taskDiffer('project-x', 'track-1', '', null);
    expect(result).toBeNull();
  });
});