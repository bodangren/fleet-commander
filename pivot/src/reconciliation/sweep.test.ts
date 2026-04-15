import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { runReconciliationSweep } from './sweep';
import { computeMarkdownHash } from './hash';

const TEST_PROJECT_DIR = join(process.cwd(), 'test-reconciliation-project');

describe('runReconciliationSweep', () => {
  beforeEach(() => {
    mkdirSync(TEST_PROJECT_DIR, { recursive: true });
    mkdirSync(join(TEST_PROJECT_DIR, 'conductor', 'tracks'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  });

  it('detects added track', async () => {
    const trackMd = `# New Track

## Phase 1
- [ ] Task: First task
`;
    const trackDir = join(TEST_PROJECT_DIR, 'conductor', 'tracks', 'new_track_20260416');
    mkdirSync(trackDir, { recursive: true });
    writeFileSync(join(trackDir, 'plan.md'), trackMd);

    const divergences = await runReconciliationSweep('test-project', TEST_PROJECT_DIR);

    const added = divergences.filter(d => d.divergenceType === 'added' && d.artifactType === 'track');
    expect(added.length).toBeGreaterThan(0);
    expect(added[0]!.artifactId).toBe('New Track');
  });

  it('detects multiple added tracks', async () => {
    const trackMd1 = `# Track One

## Phase 1
- [ ] Task: First task
`;
    const trackMd2 = `# Track Two

## Phase 1
- [ ] Task: Second task
`;
    const trackDir1 = join(TEST_PROJECT_DIR, 'conductor', 'tracks', 'track_one_20260416');
    const trackDir2 = join(TEST_PROJECT_DIR, 'conductor', 'tracks', 'track_two_20260416');
    mkdirSync(trackDir1, { recursive: true });
    mkdirSync(trackDir2, { recursive: true });
    writeFileSync(join(trackDir1, 'plan.md'), trackMd1);
    writeFileSync(join(trackDir2, 'plan.md'), trackMd2);

    const divergences = await runReconciliationSweep('test-project', TEST_PROJECT_DIR);

    const added = divergences.filter(d => d.divergenceType === 'added' && d.artifactType === 'track');
    expect(added.length).toBe(2);
  });

  it('handles empty project directory', async () => {
    const divergences = await runReconciliationSweep('empty-project', TEST_PROJECT_DIR);
    expect(divergences).toEqual([]);
  });

  it('returns empty array for non-existent project path', async () => {
    const divergences = await runReconciliationSweep('nonexistent', '/nonexistent/path');
    expect(divergences).toEqual([]);
  });
});