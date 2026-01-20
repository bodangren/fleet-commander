import { describe, it, expect } from 'vitest';
import { enrichTasksWithGitActivity } from './git-task-matcher';
import type { GitCommit } from './git-reader';
import type { NormalizeTaskInput } from '../shared/board';

describe('enrichTasksWithGitActivity', () => {
  it('prefers Task lines in notes and keeps the most recent match', () => {
    const commits: GitCommit[] = [
      {
        hash: 'new1234',
        timestamp: '2026-01-20T12:00:00Z',
        subject: 'chore: update copy',
        notes: 'Task: Build board\nFiles: src/main/project-loader.ts',
      },
      {
        hash: 'old5678',
        timestamp: '2026-01-19T08:00:00Z',
        subject: 'feat: Build board layout',
        notes: null,
      },
    ];

    const tasks: NormalizeTaskInput[] = [
      {
        title: 'Build board',
        trackId: 'track-1',
        trackTitle: 'Track One',
        phase: 'Phase 3',
        marker: '[ ]',
      },
    ];

    const enriched = enrichTasksWithGitActivity(tasks, commits);

    expect(enriched[0].activity?.commitHash).toBe('new1234');
    expect(enriched[0].activity?.timestamp).toBe('2026-01-20T12:00:00Z');
  });

  it('matches commit subjects when notes are absent', () => {
    const commits: GitCommit[] = [
      {
        hash: 'abc1234',
        timestamp: '2026-01-20T10:00:00Z',
        subject: 'feat: Add git history reader utilities',
        notes: null,
      },
    ];

    const tasks: NormalizeTaskInput[] = [
      {
        title: 'Add git history reader utilities',
        trackId: 'track-2',
        trackTitle: 'Track Two',
        phase: 'Phase 4',
        marker: '[ ]',
      },
    ];

    const enriched = enrichTasksWithGitActivity(tasks, commits);

    expect(enriched[0].activity?.commitHash).toBe('abc1234');
  });

  it('infers in-progress and marks needs sync when a todo task has activity', () => {
    const commits: GitCommit[] = [
      {
        hash: 'def5678',
        timestamp: '2026-01-20T15:00:00Z',
        subject: 'feat: Match git data to tasks and infer status',
        notes: null,
      },
    ];

    const tasks: NormalizeTaskInput[] = [
      {
        title: 'Match git data to tasks and infer status',
        trackId: 'track-3',
        trackTitle: 'Track Three',
        phase: 'Phase 4',
        marker: '[ ]',
      },
      {
        title: 'Unrelated task',
        trackId: 'track-3',
        trackTitle: 'Track Three',
        phase: 'Phase 4',
        marker: '[ ]',
      },
    ];

    const enriched = enrichTasksWithGitActivity(tasks, commits);

    expect(enriched[0].status).toBe('in_progress');
    expect(enriched[0].statusSource).toBe('inferred');
    expect(enriched[0].needsSync).toBe(true);
    expect(enriched[1].status).toBe('todo');
    expect(enriched[1].activity).toBeNull();
  });
});
