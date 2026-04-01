import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createConvexClient } from '../convexClient';
import { parseImportedTrack, renderPlanMarkdown, renderSpecMarkdown } from './trackMarkdown';

function usage(): never {
  throw new Error(
    'Usage: bun src/sync/convexTrackSync.ts <export|import> <projectSlug> <trackId|trackDir> <outputDir?>',
  );
}

async function exportTrack(projectSlug: string, trackId: string, outputDir: string) {
  const client = createConvexClient();
  const snapshot = await client.query(
    'tracks:getTrackSnapshot' as never,
    { projectSlug, trackId } as never,
  );
  if (!snapshot) {
    throw new Error(`Track not found in Convex: ${projectSlug}/${trackId}`);
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'spec.md'), renderSpecMarkdown(snapshot), 'utf8');
  await writeFile(join(outputDir, 'plan.md'), renderPlanMarkdown(snapshot), 'utf8');
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
  await client.mutation('tracks:upsertTrackSnapshot' as never, parsed as never);
}

async function main() {
  const [, , command, projectSlug, third, fourth] = process.argv;
  if (!command || !projectSlug || !third) usage();

  if (command === 'export') {
    if (!fourth) usage();
    await exportTrack(projectSlug, third, fourth);
    return;
  }

  if (command === 'import') {
    await importTrack(projectSlug, third);
    return;
  }

  usage();
}

await main();
