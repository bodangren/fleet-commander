import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { parseImportedTrack } from './trackMarkdown';

// Convex state is derived. To change a track, edit the markdown; the importer will pick it up.

/**
 * Print usage instructions and exit.
 * @returns Never returns (always throws)
 */
function usage(): never {
  throw new Error(
    'Usage: bun src/sync/convexTrackSync.ts import <projectSlug> <trackDir>',
  );
}

/**
 * Import a track from markdown files to Convex.
 * @param projectSlug - The project identifier
 * @param trackDir - The directory containing spec.md and plan.md
 */
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

/**
 * Main entry point for the convexTrackSync CLI.
 */
async function main() {
  const [, , command, projectSlug, third] = process.argv;
  if (command !== 'import' || !projectSlug || !third) usage();
  await importTrack(projectSlug, third);
}

if (import.meta.main) {
  await main();
}
