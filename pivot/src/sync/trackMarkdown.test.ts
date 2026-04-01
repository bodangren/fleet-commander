import { describe, expect, test } from 'bun:test';
import {
  parseImportedTrack,
  renderPlanMarkdown,
  renderSpecMarkdown,
} from './trackMarkdown';

describe('track markdown sync contract', () => {
  test('renders spec and plan headers with version for reversible export/import', () => {
    const snapshot = {
      projectSlug: 'kanban-conductor',
      trackId: 'platform_pivot_bun_convex_20260401',
      title: 'Strategic Platform Pivot: Bun + Convex',
      status: 'active' as const,
      specMarkdown: 'Spec body',
      planMarkdown: '- [ ] Task one',
      version: 4,
      updatedAt: Date.now(),
    };

    const spec = renderSpecMarkdown(snapshot);
    const plan = renderPlanMarkdown(snapshot);

    expect(spec).toContain('X-Fleet-Version: 4');
    expect(plan).toContain('X-Fleet-Version: 4');
    expect(spec).toContain('Track-ID: platform_pivot_bun_convex_20260401');
  });

  test('parses imported markdown and extracts conflict token', () => {
    const parsed = parseImportedTrack({
      projectSlug: 'kanban-conductor',
      trackId: 'platform_pivot_bun_convex_20260401',
      specMarkdown: [
        '# Strategic Platform Pivot: Bun + Convex',
        'X-Fleet-Version: 9',
        'Status: blocked',
        '',
        'Body',
      ].join('\n'),
      planMarkdown: '- [x] Task',
    });

    expect(parsed.title).toBe('Strategic Platform Pivot: Bun + Convex');
    expect(parsed.status).toBe('blocked');
    expect(parsed.expectedVersion).toBe(9);
  });
});
