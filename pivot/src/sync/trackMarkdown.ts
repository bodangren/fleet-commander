import type { TrackSnapshotDto } from '../types';

const VERSION_HEADER = 'X-Fleet-Version';

// Convex state is derived. To change a track, edit the markdown; the importer will pick it up.

function readHeader(markdown: string, key: string): string | null {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() ?? null;
}

function normalizeStatus(value: string | null): TrackSnapshotDto['status'] {
  switch (value) {
    case 'active':
    case 'blocked':
    case 'complete':
    case 'archived':
      return value;
    default:
      return 'new';
  }
}

export function parseImportedTrack(input: {
  projectSlug: string;
  trackId: string;
  specMarkdown: string;
  planMarkdown: string;
}): {
  projectSlug: string;
  trackId: string;
  title: string;
  status: TrackSnapshotDto['status'];
  expectedVersion: number | null;
  specMarkdown: string;
  planMarkdown: string;
} {
  const titleLine = input.specMarkdown.split('\n').find((line) => line.startsWith('# '));
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : input.trackId;
  const status = normalizeStatus(readHeader(input.specMarkdown, 'Status'));
  const versionRaw = readHeader(input.specMarkdown, VERSION_HEADER);
  const expectedVersion = versionRaw ? Number(versionRaw) : null;

  return {
    projectSlug: input.projectSlug,
    trackId: input.trackId,
    title,
    status,
    expectedVersion: Number.isFinite(expectedVersion) ? expectedVersion : null,
    specMarkdown: input.specMarkdown.trim(),
    planMarkdown: input.planMarkdown.trim(),
  };
}
