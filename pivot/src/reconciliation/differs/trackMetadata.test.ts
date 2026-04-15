import { describe, expect, it } from 'bun:test';
import { trackMetadataDiffer, TrackMetadata } from './trackMetadata';
import { computeMarkdownHash } from '../hash';

describe('trackMetadataDiffer', () => {
  it('detects added track', () => {
    const conductorMd = `# New Track

## Phase 1
- [ ] Task: First task`;

    const result = trackMetadataDiffer('project-x', conductorMd, null);
    expect(result).not.toBeNull();
    expect(result!.divergenceType).toBe('added');
    expect(result!.artifactId).toBe('New Track');
  });

  it('detects modified track when hash differs', () => {
    const conductorMd = `# Updated Track Title

## Phase 1
- [ ] Task: First task`;

    const canonical: TrackMetadata = {
      title: 'Original Track Title',
      phases: [],
      lastKnownHash: 'different-hash',
    };

    const result = trackMetadataDiffer('project-x', conductorMd, canonical);
    expect(result).not.toBeNull();
    expect(result!.divergenceType).toBe('modified');
  });

  it('returns null when conductor hash matches canonical hash', () => {
    const md = `# Same Track

## Phase 1
- [ ] Task: Same task`;
    const hash = computeMarkdownHash(md);

    const canonical: TrackMetadata = {
      title: 'Same Track',
      phases: ['Phase 1'],
      lastKnownHash: hash,
    };

    const result = trackMetadataDiffer('project-x', md, canonical);
    expect(result).toBeNull();
  });

  it('handles empty conductor markdown', () => {
    const result = trackMetadataDiffer('project-x', '', null);
    expect(result).toBeNull();
  });
});