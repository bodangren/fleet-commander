import { describe, expect, it } from 'bun:test';
import * as tracks from './tracks';
import { createMockCtx } from './__fixtures__/foundation';

describe('createTrack', () => {
  it('seeds a new track snapshot with title, goal-anchored spec, and empty plan', async () => {
    const ctx = createMockCtx();

    const result = await (tracks.createTrack as any)(ctx, {
      projectSlug: 'demo-app',
      trackId: 'awesome_feature_20260610',
      title: 'Awesome Feature',
      goal: 'Ship the awesome feature so users can be awesome.',
    });

    expect(result.trackId).toBe('awesome_feature_20260610');
    expect(result.title).toBe('Awesome Feature');
    expect(result.status).toBe('new');
    expect(result.version).toBe(1);
    expect(result.specMarkdown).toContain('# Awesome Feature');
    expect(result.specMarkdown).toContain('## Goal');
    expect(result.specMarkdown).toContain('Ship the awesome feature so users can be awesome.');
    expect(result.planMarkdown).toContain('# Implementation Plan');
  });

  it('rejects a duplicate trackId for the same project', async () => {
    const ctx = createMockCtx();

    await (tracks.createTrack as any)(ctx, {
      projectSlug: 'demo-app',
      trackId: 'dup_track_20260610',
      title: 'First',
      goal: 'do a thing',
    });

    await expect(
      (tracks.createTrack as any)(ctx, {
        projectSlug: 'demo-app',
        trackId: 'dup_track_20260610',
        title: 'Second',
        goal: 'do another thing',
      }),
    ).rejects.toThrow();
  });
});
