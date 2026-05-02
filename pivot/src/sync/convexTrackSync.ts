import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { parseImportedTrack } from './trackMarkdown';

// Convex state is derived. To change a track, edit the markdown; the importer will pick it up.

function usage(): never {
  throw new Error(
    'Usage: bun src/sync/convexTrackSync.ts import <projectSlug> <trackDir>',
  );
}

async function importTrack(projectSlug: string, trackDir: string) {
  const specMarkdown = await readFile(join(trackDir, 'spec.md'), 'utf8');
  const planMarkdown = await readFile(join(trackDir, 'plan.md'), 'utf8');
  const inferredTrackId = trackDir.split('/').filter(Boolean).at(-1) ?? 'unknown_track';
  const parsed = parseImportedTrack({
    projectSlug,
    trackId: inferredTrackId,
    specMarkdown,
    planMarkdown,
  });

  const client = createConvexClient();
  const { expectedVersion, ...rest } = parsed;
  await client.mutation(api.tracks.upsertTrackSnapshot, {
    ...rest,
    expectedVersion: expectedVersion ?? undefined,
  });
}

async function main() {
  const [, , command, projectSlug, third] = process.argv;
  if (command !== 'import' || !projectSlug || !third) usage();
  await importTrack(projectSlug, third);
}

await main();
