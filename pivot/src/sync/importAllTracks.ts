import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { parseImportedTrack } from './trackMarkdown';
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const TRACKS_DIR = args[0] ? resolve(args[0]) : resolve(import.meta.dir, '../../../measure/tracks');
const PROJECT_SLUG = args[1] ?? 'fleet-commander';

async function importAllTracks() {
  const client = createConvexClient();

  // Look up project by name; auto-create if missing
  let project = await client.query(api.projects.getProjectByNameHandler, { name: PROJECT_SLUG });
  if (!project) {
    const id = await client.mutation(api.projects.createProjectHandler, {
      name: PROJECT_SLUG,
      description: `Auto-created for track import`,
    });
    project = await client.query(api.projects.getProjectHandler, { id });
  }
  if (!project) {
    console.error(`Failed to find or create project: ${PROJECT_SLUG}`);
    process.exit(1);
  }

  const entries = readdirSync(TRACKS_DIR);
  const dirs = entries.filter((entry) => {
    const stat = statSync(join(TRACKS_DIR, entry));
    return stat.isDirectory();
  });

  console.log(`Found ${dirs.length} tracks to import...`);

  for (const dir of dirs) {
    const trackDir = join(TRACKS_DIR, dir);
    try {
      const specMarkdown = await readFile(join(trackDir, 'spec.md'), 'utf8');
      const planMarkdown = await readFile(join(trackDir, 'plan.md'), 'utf8');
      const parsed = parseImportedTrack({
        projectSlug: PROJECT_SLUG,
        trackId: dir,
        specMarkdown,
        planMarkdown,
      });

      const { expectedVersion, ...rest } = parsed;
      await client.mutation(api.tracks.upsertTrackSnapshot, {
        ...rest,
        projectId: project._id,
        expectedVersion: expectedVersion ?? undefined,
      });
      console.log(`  Imported: ${dir}`);
    } catch (err) {
      console.error(`  Failed: ${dir} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('Done.');
}

await importAllTracks();
