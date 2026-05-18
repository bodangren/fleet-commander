import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';

const DESKTOP = '/home/daniel-bo/Desktop';

interface ProjectInfo {
  slug: string;
  name: string;
  description: string;
}

function findMeasureProjects(): string[] {
  const { execSync } = require('node:child_process');
  const output = execSync(
    `find ${DESKTOP} -maxdepth 2 -type d -name "measure" | grep -v "^${DESKTOP}/measure$" | sort`,
    { encoding: 'utf8' }
  );
  return output.trim().split('\n').filter(Boolean);
}

function parseProjectInfo(measureDir: string): ProjectInfo {
  const projectDir = measureDir.replace(/\/measure$/, '');
  const slug = basename(projectDir);
  const productPath = join(measureDir, 'product.md');

  let name = slug;
  let description = '';

  if (existsSync(productPath)) {
    const content = readFileSync(productPath, 'utf8');
    // Try to extract name from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      name = titleMatch[1].trim();
      // Remove "Product Definition - " prefix if present
      name = name.replace(/^Product Definition\s+-\s+/i, '');
    }

    // Try to extract description from Vision or first paragraph after title
    const visionMatch = content.match(/##\s*Vision\s*\n+([^#]+)/i);
    if (visionMatch) {
      description = visionMatch[1].trim().split('\n')[0].trim();
    } else {
      // Fallback: take first non-empty paragraph after title
      const lines = content.split('\n');
      let afterTitle = false;
      for (const line of lines) {
        if (line.startsWith('# ')) {
          afterTitle = true;
          continue;
        }
        if (afterTitle && line.trim() && !line.startsWith('#')) {
          description = line.trim();
          break;
        }
      }
    }
  }

  // Truncate description if too long
  if (description.length > 200) {
    description = description.substring(0, 197) + '...';
  }

  return { slug, name, description };
}

async function main() {
  const client = createConvexClient();
  const measureDirs = findMeasureProjects();

  console.log(`Found ${measureDirs.length} projects with measure/ directories:\n`);

  let imported = 0;
  let failed = 0;

  for (const measureDir of measureDirs) {
    try {
      const project = parseProjectInfo(measureDir);
      console.log(`Importing: ${project.slug}`);
      console.log(`  Name: ${project.name}`);
      console.log(`  Desc: ${project.description.substring(0, 80)}${project.description.length > 80 ? '...' : ''}`);

      await client.mutation(api.projects.createProjectHandler, {
        name: project.name,
        description: project.description,
      });

      console.log(`  Status: Imported\n`);
      imported++;
    } catch (err) {
      console.error(`  Status: FAILED - ${err instanceof Error ? err.message : String(err)}\n`);
      failed++;
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Total found: ${measureDirs.length}`);
  console.log(`Imported:    ${imported}`);
  console.log(`Failed:      ${failed}`);
}

await main();
