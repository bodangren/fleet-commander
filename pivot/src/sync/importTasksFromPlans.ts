import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';

const TRACKS_DIR = '/home/daniel-bo/Desktop/fleet-commander/measure/tracks';
const PROJECT_SLUG = 'fleet-commander';

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

async function importTasksForTrack(trackId: string) {
  const client = createConvexClient();
  const trackDir = join(TRACKS_DIR, trackId);

  try {
    const planMarkdown = readFileSync(join(trackDir, 'plan.md'), 'utf8');
    const tasks = parseTasksFromPlan(planMarkdown, trackId);

    console.log(`  Track ${trackId}: found ${tasks.length} tasks`);

    for (const task of tasks) {
      try {
        await client.mutation(api.fleetCatalog.upsertTask, {
          projectSlug: PROJECT_SLUG,
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
    await importTasksForTrack(dir);
  }

  console.log('Done.');
}

await main();
