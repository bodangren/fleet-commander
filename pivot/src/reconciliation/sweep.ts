import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { normalizeMarkdown, computeMarkdownHash } from './hash';
import { taskDiffer, TaskData } from './differs/task';
import { trackMetadataDiffer, TrackMetadata } from './differs/trackMetadata';
import { issueDiffer, parseIssueFromMarkdown, IssueData } from './differs/issue';

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

export interface ReconciliationResult {
  divergences: Divergence[];
  canonical: CanonicalState;
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
 * Parse issue markdown from a file.
 * @param filePath - Path to the issue file
 * @returns {{ id: string; content: string; hash: string } | null} Parsed issue or null
 */
function parseIssueFromFile(filePath: string): { id: string; content: string; hash: string } | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const normalized = normalizeMarkdown(content);
    const titleMatch = normalized.match(/^#\s+(.+)/m);
    if (!titleMatch) return null;
    const id = titleMatch[1].trim();
    const hash = computeMarkdownHash(content);
    return { id, content, hash };
  } catch {
    return null;
  }
}

/**
 * Run reconciliation sweep to detect divergences between conductor and canonical state.
 * Detects track, task, and issue divergences.
 * @param projectSlug - Project identifier
 * @param projectPath - Path to the project
 * @returns {Promise<ReconciliationResult>} Divergences and updated canonical state
 */
export async function runReconciliationSweep(
  projectSlug: string,
  projectPath: string
): Promise<ReconciliationResult> {
  const divergences: Divergence[] = [];

  if (!existsSync(projectPath)) {
    return { divergences, canonical: emptyCanonicalState() };
  }

  const conductorPath = join(projectPath, 'conductor', 'tracks');
  if (!existsSync(conductorPath)) {
    return { divergences, canonical: emptyCanonicalState() };
  }

  const canonical = loadCanonicalState(projectSlug);
  const conductorTracks = new Map<string, { title: string; content: string; hash: string }>();

  try {
    const trackDirs = readdirSync(conductorPath);
    for (const trackDir of trackDirs) {
      const trackDirPath = join(conductorPath, trackDir);
      const planPath = join(trackDirPath, 'plan.md');
      if (existsSync(planPath)) {
        const track = parseTrackFromFile(planPath);
        if (track) {
          conductorTracks.set(track.title, track);
        }
      }

      // Scan for task files in track directory
      if (existsSync(trackDirPath)) {
        try {
          const files = readdirSync(trackDirPath);
          for (const file of files) {
            if (file.endsWith('.md') && file !== 'plan.md' && file !== 'spec.md') {
              const filePath = join(trackDirPath, file);
              const content = readFileSync(filePath, 'utf-8');
              const hash = computeMarkdownHash(content);
              const taskId = `${trackDir}/${file}`;

              const canonicalTask = canonical.tasks.get(taskId);
              if (!canonicalTask) {
                const div = taskDiffer(projectSlug, trackDir, content, null);
                if (div) divergences.push(div);
              } else if (canonicalTask.lastKnownHash !== hash) {
                const div = taskDiffer(projectSlug, trackDir, content, canonicalTask);
                if (div) divergences.push(div);
              }
              canonical.tasks.set(taskId, { taskId, status: 'todo', title: file, lastKnownHash: hash });
            }
          }
        } catch {
          // Skip unreadable directories
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[reconciliation] Failed to read conductor tracks from ${conductorPath}: ${message}`);
  }

  // Detect track divergences (added/modified)
  for (const [title, conductor] of conductorTracks) {
    const canonicalTrack = canonical.tracks.get(title);

    if (!canonicalTrack) {
      const div = trackMetadataDiffer(projectSlug, conductor.content, null);
      if (div) divergences.push(div);
    } else if (canonicalTrack.lastKnownHash !== conductor.hash) {
      const div = trackMetadataDiffer(projectSlug, conductor.content, canonicalTrack);
      if (div) divergences.push(div);
    }

    // Update canonical state with conductor data
    canonical.tracks.set(title, {
      title: conductor.title,
      phases: [],
      lastKnownHash: conductor.hash,
    });
  }

  // Detect deleted tracks
  for (const [title, canonicalTrack] of canonical.tracks) {
    if (!conductorTracks.has(title)) {
      divergences.push({
        projectSlug,
        artifactType: 'track',
        artifactId: title,
        divergenceType: 'deleted',
        conductorHash: '',
        canonicalHash: canonicalTrack.lastKnownHash ?? '',
        description: `Track deleted: ${title}`,
      });
    }
  }

  // Scan for issue files in conductor/issues/ directory
  const issuesPath = join(projectPath, 'conductor', 'issues');
  if (existsSync(issuesPath)) {
    try {
      const issueFiles = readdirSync(issuesPath);
      for (const file of issueFiles) {
        if (file.endsWith('.md')) {
          const filePath = join(issuesPath, file);
          const issue = parseIssueFromFile(filePath);
          if (issue) {
            const canonicalIssue = canonical.issues.get(issue.id);
            if (!canonicalIssue) {
              const div = issueDiffer(projectSlug, issue.content, null);
              if (div) divergences.push(div);
            } else if (canonicalIssue.lastKnownHash !== issue.hash) {
              const div = issueDiffer(projectSlug, issue.content, canonicalIssue);
              if (div) divergences.push(div);
            }
            const parsedIssue = parseIssueFromMarkdown(issue.content);
            if (parsedIssue) {
              canonical.issues.set(issue.id, { ...parsedIssue, lastKnownHash: issue.hash });
            }
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  // Detect deleted issues
  const conductorIssueIds = new Set<string>();
  if (existsSync(issuesPath)) {
    try {
      for (const file of readdirSync(issuesPath)) {
        if (file.endsWith('.md')) {
          const issue = parseIssueFromFile(join(issuesPath, file));
          if (issue) conductorIssueIds.add(issue.id);
        }
      }
    } catch {
      // Skip
    }
  }
  for (const [id, canonicalIssue] of canonical.issues) {
    if (!conductorIssueIds.has(id)) {
      divergences.push({
        projectSlug,
        artifactType: 'issue',
        artifactId: id,
        divergenceType: 'deleted',
        conductorHash: '',
        canonicalHash: canonicalIssue.lastKnownHash ?? '',
        description: `Issue deleted: ${id}`,
      });
    }
  }

  saveCanonicalState(projectSlug, canonical);

  return { divergences, canonical };
}