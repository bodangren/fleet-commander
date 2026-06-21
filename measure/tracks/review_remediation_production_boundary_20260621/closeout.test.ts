import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TRACK_ID = 'review_remediation_production_boundary_20260621';
const projectRoot = resolve(__dirname, '../../..');

function readMeasure(file: string): string {
  return readFileSync(resolve(projectRoot, 'measure', file), 'utf-8');
}

describe('Phase 6 closeout artifacts', () => {
  it('tracks.md lists this track as completed/archived', () => {
    const tracks = readMeasure('tracks.md');
    expect(tracks).toContain(TRACK_ID);
    const block = tracks.split('\n## ').find((section) => section.includes(TRACK_ID));
    expect(block).toBeDefined();
    expect(block).toMatch(/-\s*\[x\]\s*\*\*Track:/);
  });

  it('tech-debt.md resolves or omits debt owned by this track', () => {
    const debt = readMeasure('tech-debt.md');
    const openSection = debt.split('## Resolved')[0];
    expect(openSection).not.toContain(TRACK_ID);
  });

  it('lessons-learned.md captures a boundary-lesson from this track', () => {
    const lessons = readMeasure('lessons-learned.md');
    expect(lessons).toMatch(/\(red_phase_boundary|production_boundary|executionId|qualityRuns\)/);
  });
});
