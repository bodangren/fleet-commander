import { describe, it, expect } from 'vitest';
import { parseTracksFile } from '../shared/conductor';

describe('parseTracksFile', () => {
  it('parses bullet track entries with link lines', () => {
    const input = [
      '# Tracks Registry',
      '---',
      '- [~] **Track: Current work**',
      '*Link: [./tracks/current_track/](./tracks/current_track/)*',
      '- [x] **Track: Completed work**',
      '*Link: [./archive/completed_track/](./archive/completed_track/)*',
    ].join('\n');

    const tracks = parseTracksFile(input);

    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({
      title: 'Current work',
      marker: '[~]',
      status: 'in_progress',
      link: './tracks/current_track/',
      id: 'current_track',
    });
    expect(tracks[1]).toMatchObject({
      title: 'Completed work',
      marker: '[x]',
      status: 'done',
      link: './archive/completed_track/',
      id: 'completed_track',
    });
  });

  it('parses legacy heading track entries', () => {
    const input = [
      '## [ ] Track: Legacy format track',
      '*Link: [./tracks/legacy_track/](./tracks/legacy_track/)*',
    ].join('\n');

    const tracks = parseTracksFile(input);

    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      title: 'Legacy format track',
      marker: '[ ]',
      status: 'todo',
      link: './tracks/legacy_track/',
      id: 'legacy_track',
    });
  });

  it('handles missing link lines gracefully', () => {
    const input = '- [ ] **Track: Linkless track**';

    const tracks = parseTracksFile(input);

    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      title: 'Linkless track',
      marker: '[ ]',
      status: 'todo',
      link: null,
      id: null,
    });
  });

  it('ignores unrelated lines', () => {
    const input = [
      '# Tracks Registry',
      'Random notes here',
      '- [ ] **Track: Valid track**',
      '*Link: [./tracks/valid_track/](./tracks/valid_track/)*',
      'Trailing text',
    ].join('\n');

    const tracks = parseTracksFile(input);

    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe('valid_track');
  });
});
