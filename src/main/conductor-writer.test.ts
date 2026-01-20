import { describe, it, expect } from 'vitest';
import { updatePlanTaskMarker, updateTracksMarker, updateTrackMetadata } from './conductor-writer';

describe('updatePlanTaskMarker', () => {
  it('updates the marker for a task within the matching phase', () => {
    const input = [
      '# Implementation Plan',
      '## Phase 1: Setup',
      '- [ ] Task: First task',
      '- [x] Task: Done task',
      '',
      '## Phase 2: Build [checkpoint: abc1234]',
      '- [ ] Task: Build UI',
    ].join('\n');

    const output = updatePlanTaskMarker(input, {
      phaseTitle: 'Phase 2: Build',
      taskTitle: 'Build UI',
      nextMarker: '[~]',
    });

    expect(output).toContain('- [~] Task: Build UI');
    expect(output).toContain('- [ ] Task: First task');
    expect(output).toContain('- [x] Task: Done task');
  });
});

describe('updateTracksMarker', () => {
  it('updates the marker for a bullet-style track entry', () => {
    const input = [
      '# Tracks Registry',
      '---',
      '- [ ] **Track: Track One**',
      '*Link: [./tracks/track-one/](./tracks/track-one/)*',
    ].join('\n');

    const output = updateTracksMarker(input, {
      trackTitle: 'Track One',
      nextMarker: '[x]',
    });

    expect(output).toContain('- [x] **Track: Track One**');
  });
});

describe('updateTrackMetadata', () => {
  it('updates status and updated_at fields', () => {
    const input = JSON.stringify(
      {
        track_id: 'track-one',
        type: 'feature',
        status: 'new',
        created_at: '2026-01-20T00:00:00Z',
        updated_at: '2026-01-20T00:00:00Z',
        description: 'Sample',
      },
      null,
      2,
    );

    const output = updateTrackMetadata(input, {
      status: 'completed',
      updatedAt: '2026-01-21T08:00:00Z',
    });
    const parsed = JSON.parse(output);

    expect(parsed.status).toBe('completed');
    expect(parsed.updated_at).toBe('2026-01-21T08:00:00Z');
    expect(parsed.created_at).toBe('2026-01-20T00:00:00Z');
  });
});
