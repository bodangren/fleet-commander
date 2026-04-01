import type { TrackSnapshotDto } from '../types';

const VERSION_HEADER = 'X-Fleet-Version';

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

export function renderSpecMarkdown(snapshot: TrackSnapshotDto): string {
  return `# ${snapshot.title}
${VERSION_HEADER}: ${snapshot.version}
Track-ID: ${snapshot.trackId}
Project-Slug: ${snapshot.projectSlug}
Status: ${snapshot.status}

${snapshot.specMarkdown}
`;
}

export function renderPlanMarkdown(snapshot: TrackSnapshotDto): string {
  return `# Implementation Plan - ${snapshot.title}
${VERSION_HEADER}: ${snapshot.version}
Track-ID: ${snapshot.trackId}
Project-Slug: ${snapshot.projectSlug}
Status: ${snapshot.status}

${snapshot.planMarkdown}
`;
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
