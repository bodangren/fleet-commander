import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { parseImportedTrack } from './trackMarkdown';
import { readFile } from 'node:fs/promises';

const TRACKS_DIR = '/home/daniel-bo/Desktop/fleet-commander/measure/tracks';
const PROJECT_SLUG = 'kanban-conductor';

async function importAllTracks() {
  const client = createConvexClient();
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
