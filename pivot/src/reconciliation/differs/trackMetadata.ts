import { normalizeMarkdown, computeMarkdownHash } from '../hash';

export interface TrackMetadata {
  title: string;
  phases: string[];
  lastKnownHash?: string;
}

export interface Divergence {
  projectSlug: string;
  artifactType: 'track';
  artifactId: string;
  divergenceType: 'added' | 'modified' | 'deleted';
  conductorHash: string;
  canonicalHash: string;
  description: string;
}

function parseTrackMetadata(md: string): TrackMetadata | null {
  if (!md.trim()) return null;

  const normalized = normalizeMarkdown(md);
  const titleMatch = normalized.match(/^#\s+(.+)/m);
  if (!titleMatch) return null;

  const title = titleMatch[1].trim();

  const phaseRegex = /^##\s+(.+)/gm;
  const phases: string[] = [];
  let match;
  while ((match = phaseRegex.exec(normalized)) !== null) {
    phases.push(match[1].trim());
  }

  return { title, phases };
}

export function trackMetadataDiffer(
  projectSlug: string,
  conductorMd: string,
  canonical: TrackMetadata | null
): Divergence | null {
  const conductorMeta = parseTrackMetadata(conductorMd);
  const conductorHash = computeMarkdownHash(conductorMd);

  if (!canonical) {
    if (conductorMeta) {
      return {
        projectSlug,
        artifactType: 'track',
        artifactId: conductorMeta.title,
        divergenceType: 'added',
        conductorHash,
        canonicalHash: '',
        description: `New track added: ${conductorMeta.title}`,
      };
    }
    return null;
  }

  if (!conductorMeta) {
    return null;
  }

  const canonicalHash = canonical.lastKnownHash || '';

  if (canonicalHash && conductorHash !== canonicalHash) {
    const changes: string[] = [];
    if (conductorMeta.title !== canonical.title) {
      changes.push(`title changed from "${canonical.title}" to "${conductorMeta.title}"`);
    }
    if (JSON.stringify(conductorMeta.phases.sort()) !== JSON.stringify(canonical.phases.sort())) {
      changes.push(`phases changed`);
    }
    return {
      projectSlug,
      artifactType: 'track',
      artifactId: conductorMeta.title,
      divergenceType: 'modified',
      conductorHash,
      canonicalHash,
      description: `Track modified: ${changes.join('; ')}`,
    };
  }

  return null;
}