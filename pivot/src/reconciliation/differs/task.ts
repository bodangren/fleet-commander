import { normalizeMarkdown, computeMarkdownHash } from '../hash';

export interface TaskData {
  taskId: string;
  status: 'todo' | 'in_progress' | 'done';
  title: string;
  lastKnownHash?: string;
}

export interface Divergence {
  projectSlug: string;
  artifactType: 'task';
  artifactId: string;
  divergenceType: 'added' | 'modified' | 'deleted';
  conductorHash: string;
  canonicalHash: string;
  description: string;
}

function parseTasksFromMarkdown(md: string): Map<string, TaskData> {
  const tasks = new Map<string, TaskData>();
  if (!md.trim()) return tasks;

  const normalized = normalizeMarkdown(md);
  const taskRegex = /#\s*Task\s+(.+?)\n([\s\S]*?)(?=#\s*Task\s+|$)/gi;
  let match;

  while ((match = taskRegex.exec(normalized)) !== null) {
    const taskId = match[1].trim();
    const taskBody = match[2];

    const checkboxMatch = taskBody.match(/-\s*\[([ x])\]\s*Task:\s*(.+)/i);
    const status = checkboxMatch
      ? (checkboxMatch[1] === 'x' ? 'done' : 'todo')
      : 'todo';
    const title = checkboxMatch ? checkboxMatch[2].trim() : taskBody.trim();

    tasks.set(taskId, { taskId, status, title });
  }

  return tasks;
}

export function taskDiffer(
  projectSlug: string,
  trackId: string,
  conductorMd: string,
  canonical: TaskData | null
): Divergence | null {
  const conductorTasks = parseTasksFromMarkdown(conductorMd);
  const conductorHash = computeMarkdownHash(conductorMd);

  if (!canonical) {
    const firstTask = conductorTasks.values().next().value;
    if (firstTask) {
      return {
        projectSlug,
        artifactType: 'task',
        artifactId: firstTask.taskId,
        divergenceType: 'added',
        conductorHash,
        canonicalHash: '',
        description: `New task added: ${firstTask.title}`,
      };
    }
    return null;
  }

  const conductorTask = conductorTasks.get(canonical.taskId);
  if (!conductorTask) {
    return null;
  }

  const canonicalHash = canonical.lastKnownHash || '';

  if (canonicalHash && conductorHash !== canonicalHash) {
    return {
      projectSlug,
      artifactType: 'task',
      artifactId: canonical.taskId,
      divergenceType: 'modified',
      conductorHash,
      canonicalHash,
      description: `Task modified: ${canonical.title}`,
    };
  }

  return null;
}