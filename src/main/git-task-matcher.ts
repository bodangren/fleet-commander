import { createTaskId, normalizeTask, NormalizeTaskInput, TaskActivity, BoardTask } from '../shared/board';
import type { GitCommit } from './git-reader';

interface TaskMatchInput extends NormalizeTaskInput {
  id: string;
  normalizedTitle: string;
}

function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase();
}

function extractTaskTitleFromNotes(notes: string | null): string | null {
  if (!notes) {
    return null;
  }

  const lines = notes.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*Task:\s*(.+)$/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function buildTaskInputs(tasks: NormalizeTaskInput[]): TaskMatchInput[] {
  return tasks.map(task => ({
    ...task,
    id: createTaskId(task.trackId, task.phase, task.title),
    normalizedTitle: normalizeMatchText(task.title),
  }));
}

function commitMatchesTask(commit: GitCommit, task: TaskMatchInput): boolean {
  const noteTitle = extractTaskTitleFromNotes(commit.notes);
  if (noteTitle && normalizeMatchText(noteTitle) === task.normalizedTitle) {
    return true;
  }

  if (!commit.subject) {
    return false;
  }

  return normalizeMatchText(commit.subject).includes(task.normalizedTitle);
}

export function buildTaskActivityMap(
  tasks: NormalizeTaskInput[],
  commits: GitCommit[],
): Map<string, TaskActivity> {
  const taskInputs = buildTaskInputs(tasks);
  const activityById = new Map<string, TaskActivity>();

  for (const commit of commits) {
    for (const task of taskInputs) {
      if (activityById.has(task.id)) {
        continue;
      }

      if (commitMatchesTask(commit, task)) {
        activityById.set(task.id, {
          commitHash: commit.hash,
          timestamp: commit.timestamp,
        });
      }
    }
  }

  return activityById;
}

export function enrichTasksWithGitActivity(
  tasks: NormalizeTaskInput[],
  commits: GitCommit[],
): BoardTask[] {
  const activityById = buildTaskActivityMap(tasks, commits);

  return tasks.map(task =>
    normalizeTask({
      ...task,
      activity: activityById.get(createTaskId(task.trackId, task.phase, task.title)) ?? null,
    }),
  );
}
