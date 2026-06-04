import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
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

export interface CanonicalState {
  tracks: Map<string, TrackMetadata & { lastKnownHash?: string }>;
  tasks: Map<string, TaskData & { lastKnownHash?: string }>;
  issues: Map<string, IssueData & { lastKnownHash?: string }>;
}

function emptyCanonicalState(): CanonicalState {
  return {
    tracks: new Map(),
    tasks: new Map(),
    issues: new Map(),
  };
}

function getCanonicalStatePath(projectSlug: string): string {
  const safeSlug = projectSlug.replace(/[^a-zA-Z0-9_-]/g, '-');
  return join(process.cwd(), '.fleet-commander', 'reconciliation', `${safeSlug}.json`);
}

/**
 * Load canonical state for a project from local reconciliation storage.
 * @param projectSlug - Project identifier
 * @returns Persisted canonical state, or an empty state when none exists
 */
export function loadCanonicalState(projectSlug: string): CanonicalState {
  const state = emptyCanonicalState();
  const statePath = getCanonicalStatePath(projectSlug);
  if (!existsSync(statePath)) return state;

  const raw = JSON.parse(readFileSync(statePath, 'utf-8')) as {
    tracks?: Array<[string, TrackMetadata & { lastKnownHash?: string }]>;
    tasks?: Array<[string, TaskData & { lastKnownHash?: string }]>;
    issues?: Array<[string, IssueData & { lastKnownHash?: string }]>;
  };

  return {
    tracks: new Map(raw.tracks ?? []),
    tasks: new Map(raw.tasks ?? []),
    issues: new Map(raw.issues ?? []),
  };
}

/**
 * Save canonical state for a project to local reconciliation storage.
 * @param projectSlug - Project identifier
 * @param state - Canonical state to persist
 */
export function saveCanonicalState(projectSlug: string, state: CanonicalState): void {
  const statePath = getCanonicalStatePath(projectSlug);
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(
    statePath,
    JSON.stringify(
      {
        tracks: Array.from(state.tracks.entries()),
        tasks: Array.from(state.tasks.entries()),
        issues: Array.from(state.issues.entries()),
      },
      null,
      2,
    ),
    'utf-8',
  );
}

/**
 * Parse track data from a plan.md file.
 * @param filePath - Path to the track plan file
 * @returns {{ title: string; content: string; hash: string } | null} Parsed track or null
 */
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

/**
 * Run reconciliation sweep to detect divergences between conductor and canonical state.
 * @param projectSlug - Project identifier
 * @param projectPath - Path to the project
 * @returns {Promise<Divergence[]>} Array of detected divergences
 */
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[reconciliation] Failed to read conductor tracks from ${conductorPath}: ${message}`);
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