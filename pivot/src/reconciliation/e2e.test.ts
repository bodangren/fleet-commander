import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { runReconciliationSweep, saveCanonicalState, type CanonicalState } from './sweep';
import {
  detectStuckTasks,
  detectOrphanSprints,
  reconcileTaskState,
  type TaskRecord,
  type PipelineRunRecord,
  type SprintRecord,
} from '../orchestrator/reconciliationHelpers';

const TEST_PROJECT_DIR = join(process.cwd(), 'test-reconciliation-e2e');

describe('Reconciliation end-to-end', () => {
  beforeEach(() => {
    mkdirSync(TEST_PROJECT_DIR, { recursive: true });
    mkdirSync(join(TEST_PROJECT_DIR, 'conductor', 'tracks'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    rmSync(join(process.cwd(), '.fleet-commander'), { recursive: true, force: true });
  });

  it('detects drift, runs sweep, and verifies detection', async () => {
    // Step 1: Create a track in conductor
    const trackMd = `# Test Track

## Phase 1
- [ ] Task: Build feature
- [ ] Task: Write tests
`;
    const trackDir = join(TEST_PROJECT_DIR, 'conductor', 'tracks', 'test_track_20260605');
    mkdirSync(trackDir, { recursive: true });
    writeFileSync(join(trackDir, 'plan.md'), trackMd);

    // Step 2: Run sweep - should detect added track
    const result = await runReconciliationSweep('e2e-project', TEST_PROJECT_DIR);

    const addedTracks = result.divergences.filter(
      (d) => d.divergenceType === 'added' && d.artifactType === 'track',
    );
    expect(addedTracks.length).toBeGreaterThan(0);
    expect(addedTracks[0]!.artifactId).toBe('Test Track');

    // Step 3: Verify canonical state was persisted
    expect(result.canonical.tracks.has('Test Track')).toBe(true);
  });

  it('detects deleted tracks after initial sweep', async () => {
    // Step 1: Create initial state with a track
    const trackMd = `# Original Track

## Phase 1
- [ ] Task: First task
`;
    const trackDir = join(TEST_PROJECT_DIR, 'conductor', 'tracks', 'original_track_20260605');
    mkdirSync(trackDir, { recursive: true });
    writeFileSync(join(trackDir, 'plan.md'), trackMd);

    // First sweep to establish canonical state
    await runReconciliationSweep('delete-test', TEST_PROJECT_DIR);

    // Step 2: Delete the track
    rmSync(trackDir, { recursive: true, force: true });

    // Step 3: Run second sweep - should detect deleted track
    const result = await runReconciliationSweep('delete-test', TEST_PROJECT_DIR);

    const deletedTracks = result.divergences.filter(
      (d) => d.divergenceType === 'deleted' && d.artifactType === 'track',
    );
    expect(deletedTracks.length).toBe(1);
    expect(deletedTracks[0]!.artifactId).toBe('Original Track');
  });

  it('detects stuck tasks and recommends repair', () => {
    const now = Date.now();
    const thresholdMs = 30 * 60 * 1000;

    const tasks: TaskRecord[] = [
      { _id: 'task-stuck', status: 'in_progress', updatedAt: now - 45 * 60 * 1000 },
      { _id: 'task-active', status: 'in_progress', updatedAt: now - 10 * 60 * 1000 },
      { _id: 'task-done', status: 'done', updatedAt: now - 60 * 60 * 1000 },
    ];

    // Detect stuck tasks
    const stuckIds = detectStuckTasks(tasks, [], thresholdMs, now);
    expect(stuckIds).toEqual(['task-stuck']);

    // Reconcile should recommend moving stuck task back to ready
    const stuckTask = tasks.find((t) => t._id === 'task-stuck')!;
    const recommendation = reconcileTaskState(stuckTask, tasks, [], thresholdMs, now);
    expect(recommendation).toBe('ready');

    // Active task should not be recommended for repair
    const activeTask = tasks.find((t) => t._id === 'task-active')!;
    const activeRecommendation = reconcileTaskState(activeTask, tasks, [], thresholdMs, now);
    expect(activeRecommendation).toBeNull();
  });

  it('detects orphan sprints and recommends closure', () => {
    const sprints: SprintRecord[] = [
      { _id: 'sprint-orphan', status: 'active', projectId: 'p1' },
      { _id: 'sprint-active', status: 'active', projectId: 'p1' },
    ];

    const tasks: TaskRecord[] = [
      { _id: 't1', status: 'done', updatedAt: 0, sprintId: 'sprint-orphan' },
      { _id: 't2', status: 'done', updatedAt: 0, sprintId: 'sprint-orphan' },
      { _id: 't3', status: 'ready', updatedAt: 0, sprintId: 'sprint-active' },
    ];

    const orphanIds = detectOrphanSprints(sprints, tasks);
    expect(orphanIds).toEqual(['sprint-orphan']);
  });

  it('reconciles blocked tasks when dependencies complete', () => {
    const now = Date.now();
    const tasks: TaskRecord[] = [
      { _id: 'task-blocked', status: 'blocked', updatedAt: now, dependencies: ['dep-1'] },
      { _id: 'dep-1', status: 'done', updatedAt: now },
    ];

    const recommendation = reconcileTaskState(
      tasks[0]!,
      tasks,
      [],
      30 * 60 * 1000,
      now,
    );
    expect(recommendation).toBe('ready');
  });

  it('reconciles ready tasks when dependencies become incomplete', () => {
    const now = Date.now();
    const tasks: TaskRecord[] = [
      { _id: 'task-ready', status: 'ready', updatedAt: now, dependencies: ['dep-1'] },
      { _id: 'dep-1', status: 'in_progress', updatedAt: now },
    ];

    const recommendation = reconcileTaskState(
      tasks[0]!,
      tasks,
      [],
      30 * 60 * 1000,
      now,
    );
    expect(recommendation).toBe('blocked');
  });
});
