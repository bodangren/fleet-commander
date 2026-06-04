import { readdirSync, existsSync, readFileSync } from 'node:fs';
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
    'Usage: bun src/sync/rebuild.ts <projectSlug> [projectRoot]\n\n' +
      'Blows away all derived track state in Convex and re-imports from markdown.\n' +
      'Running twice produces identical Convex state.',
  );
}

/**
 * Collect track directories from a project root.
 * @param projectRoot - The project root directory
 * @returns Array of track directory paths
 */
function collectTrackDirs(projectRoot: string): string[] {
  const dirs: string[] = [];
  const base = join(projectRoot, 'measure');

  for (const sub of ['tracks', 'archive']) {
    const dir = join(base, sub);
    if (!existsSync(dir)) continue;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const trackDir = join(dir, entry.name);
      const specPath = join(trackDir, 'spec.md');
      const planPath = join(trackDir, 'plan.md');
      if (existsSync(specPath) && existsSync(planPath)) {
        dirs.push(trackDir);
      }
    }
  }

  return dirs;
}

/**
 * Main entry point for rebuilding Convex state from markdown.
 * Clears all derived track state and re-imports from markdown files.
 * @param projectSlug - The project identifier
 * @param projectRootArg - Optional project root directory (defaults to cwd)
 */
async function main() {
  const [, , projectSlug, projectRootArg] = process.argv;
  if (!projectSlug) usage();

  const projectRoot = projectRootArg ?? process.cwd();
  const client = createConvexClient();

  // 1. Clear derived state
  const deleted = await client.mutation(api.tracks.clearTracksForProject, { projectSlug });
  console.log(`Cleared ${deleted} track(s) for project '${projectSlug}'`);

  // 2. Collect track directories from markdown
  const trackDirs = collectTrackDirs(projectRoot);
  console.log(`Found ${trackDirs.length} track directory(ies) to import`);

  // 3. Re-import each track
  let imported = 0;
  for (const trackDir of trackDirs) {
    const trackId = trackDir.split('/').filter(Boolean).at(-1)!;
    const specMarkdown = readFileSync(join(trackDir, 'spec.md'), 'utf8');
    const planMarkdown = readFileSync(join(trackDir, 'plan.md'), 'utf8');

    const parsed = parseImportedTrack({
      projectSlug,
      trackId,
      specMarkdown,
      planMarkdown,
    });

    const { expectedVersion, ...rest } = parsed;
    await client.mutation(api.tracks.upsertTrackSnapshot, {
      ...rest,
      expectedVersion: undefined, // no version check on rebuild
    });

    imported++;
    console.log(`  [${imported}/${trackDirs.length}] ${parsed.title} (${trackId})`);
  }

  console.log(`Rebuild complete: ${imported} track(s) imported`);
}

if (import.meta.main) {
  await main();
}
