import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parseImportedTrack } from './trackMarkdown';

/**
 * A backlog task derived from a track's spec stories or plan checklist.
 */
export interface ImportedTask {
  taskKey: string;
  title: string;
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  storyPoints: number;
}

/**
 * A single track ready to be upserted: its parsed snapshot plus derived tasks.
 */
export interface ImportedTrack {
  trackId: string;
  snapshot: ReturnType<typeof parseImportedTrack>;
  tasks: ImportedTask[];
}

/**
 * Everything ingested from one workspace directory.
 */
export interface ProjectImport {
  slug: string;
  name: string;
  tracks: ImportedTrack[];
}

const POINTS: Record<string, number> = { S: 1, M: 3, L: 5, XL: 8 };

/**
 * Convert a T-shirt estimate to story points.
 * @param size - T-shirt size such as S, M, L, or XL
 * @returns Story points, or 0 for unknown sizes
 */
export function tshirtToPoints(size: string): number {
  return POINTS[size.trim().toUpperCase()] ?? 0;
}

/**
 * Map a MoSCoW story priority to the task priority enum.
 * @param value - Priority label such as Must, Should, or Could
 * @returns The corresponding priority, defaulting to medium
 */
export function storyPriorityToPriority(value: string): ImportedTask['priority'] {
  switch (value.trim().toLowerCase()) {
    case 'must':
      return 'high';
    case 'could':
      return 'low';
    case 'should':
    default:
      return 'medium';
  }
}

/**
 * Parse top-level checklist items from a plan into backlog tasks.
 * @param planMarkdown - The plan markdown content
 * @param trackId - The track identifier used to build task keys
 * @returns Tasks derived from top-level `- [ ]` items
 */
export function parseTasksFromPlan(planMarkdown: string, trackId: string): ImportedTask[] {
  const tasks: ImportedTask[] = [];
  let taskIndex = 0;

  for (const line of planMarkdown.split('\n')) {
    const match = line.match(/^(\s*)-\s*\[([ ~x])\]\s*(.+)$/);
    if (!match) continue;
    if (match[1].length > 0) continue; // top-level only

    taskIndex++;
    const marker = match[2];
    const status: ImportedTask['status'] =
      marker === 'x' ? 'done' : marker === '~' ? 'in_progress' : 'backlog';

    tasks.push({
      taskKey: `${trackId}-task-${taskIndex}`,
      title: match[3].trim(),
      status,
      priority: 'medium',
      storyPoints: 0,
    });
  }

  return tasks;
}

/**
 * Parse a `## Stories` section into backlog tasks with estimates and priorities.
 * @param specMarkdown - The spec markdown content
 * @param trackId - The track identifier used to build task keys
 * @returns Story-derived tasks, or null when no `## Stories` section exists
 */
export function parseStoriesFromSpec(specMarkdown: string, trackId: string): ImportedTask[] | null {
  const lines = specMarkdown.split('\n');
  const start = lines.findIndex((line) => /^##\s+Stories\s*$/i.test(line));
  if (start === -1) return null;

  // Collect lines until the next level-2 heading.
  const section: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break;
    section.push(lines[i]);
  }

  const tasks: ImportedTask[] = [];
  let current: { title: string; body: string[] } | null = null;
  let storyIndex = 0;

  const flush = () => {
    if (!current) return;
    const body = current.body.join('\n');
    const estimate = body.match(/Estimate:\s*([A-Za-z]+)/i)?.[1] ?? '';
    const priority = body.match(/Priority:\s*([A-Za-z']+)/i)?.[1] ?? '';
    storyIndex++;
    tasks.push({
      taskKey: `${trackId}-story-${storyIndex}`,
      title: current.title,
      status: 'backlog',
      priority: storyPriorityToPriority(priority),
      storyPoints: tshirtToPoints(estimate),
    });
    current = null;
  };

  for (const line of section) {
    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      flush();
      // Strip an optional "Story N:" prefix from the heading.
      const title = heading[1].replace(/^Story\s+\d+:\s*/i, '').trim();
      current = { title, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  flush();

  return tasks;
}

/**
 * Derive a track's tasks, preferring spec stories and falling back to the plan.
 * @param specMarkdown - The spec markdown content
 * @param planMarkdown - The plan markdown content
 * @param trackId - The track identifier
 * @returns The track's tasks
 */
export function parseTrackTasks(
  specMarkdown: string,
  planMarkdown: string,
  trackId: string,
): ImportedTask[] {
  return parseStoriesFromSpec(specMarkdown, trackId) ?? parseTasksFromPlan(planMarkdown, trackId);
}

/**
 * Read a workspace directory and collect its importable tracks and tasks.
 * @param projectPath - Absolute path to the project workspace root
 * @returns The project slug/name and its parsed tracks (read-only, no writes)
 */
export function collectProjectImport(projectPath: string): ProjectImport {
  const slug = basename(projectPath.replace(/\/+$/, ''));
  const tracksDir = join(projectPath, 'measure', 'tracks');
  const tracks: ImportedTrack[] = [];

  if (existsSync(tracksDir)) {
    for (const entry of readdirSync(tracksDir)) {
      const trackDir = join(tracksDir, entry);
      if (!statSync(trackDir).isDirectory()) continue;

      const specPath = join(trackDir, 'spec.md');
      const planPath = join(trackDir, 'plan.md');
      const specMarkdown = existsSync(specPath) ? readFileSync(specPath, 'utf8') : '';
      const planMarkdown = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
      if (!specMarkdown && !planMarkdown) continue;

      const snapshot = parseImportedTrack({
        projectSlug: slug,
        trackId: entry,
        specMarkdown,
        planMarkdown,
      });

      tracks.push({
        trackId: entry,
        snapshot,
        tasks: parseTrackTasks(specMarkdown, planMarkdown, entry),
      });
    }
  }

  return { slug, name: slug, tracks };
}
