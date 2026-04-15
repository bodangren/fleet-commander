import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { normalizeMarkdown, computeMarkdownHash } from './hash';
import { taskDiffer, TaskData } from './differs/task';
import { trackMetadataDiffer, TrackMetadata } from './differs/trackMetadata';
import { issueDiffer, IssueData } from './differs/issue';

export interface Divergence {
  projectSlug: string;
  artifactType: 'track' | 'task' | 'issue';
  artifactId: string;
  divergenceType: 'added' | 'modified' | 'deleted';
  conductorHash: string;
  canonicalHash: string;
  description: string;
}

interface CanonicalState {
  tracks: Map<string, TrackMetadata & { lastKnownHash?: string }>;
  tasks: Map<string, TaskData & { lastKnownHash?: string }>;
  issues: Map<string, IssueData & { lastKnownHash?: string }>;
}

function loadCanonicalState(_projectSlug: string): CanonicalState {
  return {
    tracks: new Map(),
    tasks: new Map(),
    issues: new Map(),
  };
}

function saveCanonicalState(_projectSlug: string, _state: CanonicalState): void {
}

function parseTrackFromFile(filePath: string): { title: string; content: string; hash: string } | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const normalized = normalizeMarkdown(content);
    const titleMatch = normalized.match(/^#\s+(.+)/m);
    if (!titleMatch) return null;
    const title = titleMatch[1].trim();
    const hash = computeMarkdownHash(content);
    return { title, content, hash };
  } catch {
    return null;
  }
}

export async function runReconciliationSweep(
  projectSlug: string,
  projectPath: string
): Promise<Divergence[]> {
  const divergences: Divergence[] = [];

  if (!existsSync(projectPath)) {
    return divergences;
  }

  const conductorPath = join(projectPath, 'conductor', 'tracks');
  if (!existsSync(conductorPath)) {
    return divergences;
  }

  const canonical = loadCanonicalState(projectSlug);
  const conductorTracks = new Map<string, { title: string; content: string; hash: string }>();

  try {
    const trackDirs = readdirSync(conductorPath);
    for (const trackDir of trackDirs) {
      const planPath = join(conductorPath, trackDir, 'plan.md');
      if (existsSync(planPath)) {
        const track = parseTrackFromFile(planPath);
        if (track) {
          conductorTracks.set(track.title, track);
        }
      }
    }
  } catch {
    // Directory read failed, return empty
  }

  for (const [title, conductor] of conductorTracks) {
    const canonicalTrack = canonical.tracks.get(title);

    if (!canonicalTrack) {
      const div = trackMetadataDiffer(projectSlug, conductor.content, null);
      if (div) divergences.push(div);
    } else if (canonicalTrack.lastKnownHash !== conductor.hash) {
      const div = trackMetadataDiffer(projectSlug, conductor.content, canonicalTrack);
      if (div) divergences.push(div);
    }
  }

  for (const [title, canonicalTrack] of canonical.tracks) {
    if (!conductorTracks.has(title)) {
      // Track was deleted from conductor
    }
  }

  saveCanonicalState(projectSlug, canonical);

  return divergences;
}