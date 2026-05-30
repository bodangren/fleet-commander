import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';

const args = process.argv.slice(2);
const TRACKS_DIR = args[0] ? resolve(args[0]) : resolve(import.meta.dir, '../../../measure/tracks');
const PROJECT_SLUG = args[1] ?? 'fleet-commander';

/**
 * Parse tasks from a plan markdown file.
 * @param planMarkdown - The markdown content of the plan
 * @param trackId - The track identifier
 * @returns Array of task objects with taskKey, title, and status
 */
function parseTasksFromPlan(planMarkdown: string, trackId: string) {
  const tasks: Array<{
    taskKey: string;
    title: string;
    status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
  }> = [];

  const lines = planMarkdown.split('\n');
  let taskIndex = 0;

  for (const line of lines) {
    const match = line.match(/^(\s*)-\s*\[([ ~x])\]\s*(.+)$/);
    if (match) {
      const indent = match[1].length;
      const marker = match[2];
      const title = match[3].trim();

      if (indent > 0) continue;

      taskIndex++;
      const status: 'backlog' | 'in_progress' | 'done' =
        marker === 'x' ? 'done' :
        marker === '~' ? 'in_progress' :
        'backlog';

      tasks.push({
        taskKey: `${trackId}-task-${taskIndex}`,
        title,
        status,
      });
    }
  }

  return tasks;
}

/**
 * Import tasks for a specific track into Convex.
 * @param trackId - The track identifier
 * @param projectSlug - The project identifier
 */
async function importTasksForTrack(trackId: string, projectSlug: string) {
  const client = createConvexClient();
  const trackDir = join(TRACKS_DIR, trackId);

  try {
    const planMarkdown = readFileSync(join(trackDir, 'plan.md'), 'utf8');
    const tasks = parseTasksFromPlan(planMarkdown, trackId);

    console.log(`  Track ${trackId}: found ${tasks.length} tasks`);

    for (const task of tasks) {
      try {
        await client.mutation(api.fleetCatalog.upsertTask, {
          projectSlug,
          trackId,
          taskKey: task.taskKey,
          title: task.title,
          description: task.title,
          status: task.status,
          priority: 'medium',
          dependencies: [],
        });
      } catch (err) {
        console.error(`    Failed to create task ${task.taskKey}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    console.error(`  Failed to read plan for ${trackId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  const entries = readdirSync(TRACKS_DIR);
  const dirs = entries.filter((entry) => {
    const stat = statSync(join(TRACKS_DIR, entry));
    return stat.isDirectory();
  });

  console.log(`Importing tasks for ${dirs.length} tracks...`);

  for (const dir of dirs) {
    await importTasksForTrack(dir, PROJECT_SLUG);
  }

  console.log('Done.');
}

await main();
