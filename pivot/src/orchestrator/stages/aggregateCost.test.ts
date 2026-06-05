import { describe, expect, it } from 'bun:test';
import { aggregateCost, type TimingMarkers, type PipelineTimings } from './aggregateCost';

describe('aggregateCost', () => {
  const BASE = 1_000_000;

  it('computes all durations when all markers are present', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      loadStartMs: BASE + 10,
      loadEndMs: BASE + 60,
      scoreStartMs: BASE + 70,
      scoreEndMs: BASE + 120,
      executeStartMs: BASE + 130,
      executeEndMs: BASE + 330,
      persistStartMs: BASE + 340,
      persistEndMs: BASE + 390,
      hookBeforeStartMs: BASE + 5,
      hookBeforeEndMs: BASE + 8,
      hookAfterStartMs: BASE + 395,
      hookAfterEndMs: BASE + 400,
    };

    const result = aggregateCost(markers, BASE + 500);

    expect(result.loadMs).toBe(50);
    expect(result.scoreMs).toBe(50);
    expect(result.executeMs).toBe(200);
    expect(result.persistMs).toBe(50);
    expect(result.hookBeforeMs).toBe(3);
    expect(result.hookAfterMs).toBe(5);
    expect(result.totalMs).toBe(500);
  });

  it('leaves fields undefined when start marker is missing', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      loadEndMs: BASE + 60,
      scoreEndMs: BASE + 120,
    };

    const result = aggregateCost(markers, BASE + 200);

    expect(result.loadMs).toBeUndefined();
    expect(result.scoreMs).toBeUndefined();
    expect(result.executeMs).toBeUndefined();
    expect(result.totalMs).toBe(200);
  });

  it('leaves fields undefined when end marker is missing', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      loadStartMs: BASE + 10,
      scoreStartMs: BASE + 70,
    };

    const result = aggregateCost(markers, BASE + 200);

    expect(result.loadMs).toBeUndefined();
    expect(result.scoreMs).toBeUndefined();
    expect(result.totalMs).toBe(200);
  });

  it('always computes totalMs from pipelineStartMs', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
    };

    const result = aggregateCost(markers, BASE + 1234);

    expect(result.totalMs).toBe(1234);
    expect(result.loadMs).toBeUndefined();
    expect(result.scoreMs).toBeUndefined();
    expect(result.executeMs).toBeUndefined();
    expect(result.persistMs).toBeUndefined();
    expect(result.hookBeforeMs).toBeUndefined();
    expect(result.hookAfterMs).toBeUndefined();
  });

  it('returns zero durations when start equals end', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      loadStartMs: BASE + 10,
      loadEndMs: BASE + 10,
      executeStartMs: BASE + 20,
      executeEndMs: BASE + 20,
    };

    const result = aggregateCost(markers, BASE + 30);

    expect(result.loadMs).toBe(0);
    expect(result.executeMs).toBe(0);
  });

  it('handles partial marker sets (only load and execute)', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      loadStartMs: BASE + 10,
      loadEndMs: BASE + 50,
      executeStartMs: BASE + 100,
      executeEndMs: BASE + 300,
    };

    const result = aggregateCost(markers, BASE + 400);

    expect(result.loadMs).toBe(40);
    expect(result.scoreMs).toBeUndefined();
    expect(result.executeMs).toBe(200);
    expect(result.persistMs).toBeUndefined();
    expect(result.totalMs).toBe(400);
  });

  it('returns zero totalMs when now equals pipelineStartMs', () => {
    const markers: TimingMarkers = { pipelineStartMs: BASE };
    const result = aggregateCost(markers, BASE);
    expect(result.totalMs).toBe(0);
  });

  it('produces deterministic output for identical inputs', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      loadStartMs: BASE + 10,
      loadEndMs: BASE + 60,
      executeStartMs: BASE + 70,
      executeEndMs: BASE + 220,
    };
    const r1 = aggregateCost(markers, BASE + 300);
    const r2 = aggregateCost(markers, BASE + 300);
    expect(r1).toEqual(r2);
  });

  it('does not mutate the input markers', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      loadStartMs: BASE + 10,
      loadEndMs: BASE + 60,
    };
    const snapshot = JSON.stringify(markers);
    aggregateCost(markers, BASE + 100);
    aggregateCost(markers, BASE + 500);
    expect(JSON.stringify(markers)).toBe(snapshot);
  });

  it('handles a full 6-stage pipeline (load/score/execute/persist/hookBefore/hookAfter)', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      hookBeforeStartMs: BASE + 1,
      hookBeforeEndMs: BASE + 4,
      loadStartMs: BASE + 5,
      loadEndMs: BASE + 25,
      scoreStartMs: BASE + 30,
      scoreEndMs: BASE + 55,
      executeStartMs: BASE + 60,
      executeEndMs: BASE + 260,
      persistStartMs: BASE + 265,
      persistEndMs: BASE + 290,
      hookAfterStartMs: BASE + 295,
      hookAfterEndMs: BASE + 300,
    };
    const result = aggregateCost(markers, BASE + 350);
    expect(result.hookBeforeMs).toBe(3);
    expect(result.loadMs).toBe(20);
    expect(result.scoreMs).toBe(25);
    expect(result.executeMs).toBe(200);
    expect(result.persistMs).toBe(25);
    expect(result.hookAfterMs).toBe(5);
    expect(result.totalMs).toBe(350);
  });

  it('omits durations whose end-marker is missing (loadStart without loadEnd)', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      loadStartMs: BASE + 10,
      scoreStartMs: BASE + 20,
      scoreEndMs: BASE + 70,
    };
    const result = aggregateCost(markers, BASE + 100);
    expect(result.loadMs).toBeUndefined();
    expect(result.scoreMs).toBe(50);
    expect(result.totalMs).toBe(100);
  });

  it('reports failed-stage info when a start has no matching end (Red for missing feature)', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      loadStartMs: BASE + 10,
      executeStartMs: BASE + 30,
    };
    const result = aggregateCost(markers, BASE + 50) as PipelineTimings & {
      failedStage?: string;
    };
    expect(result.failedStage).toBe('load');
  });

  it('aggregates cost by stage role (Red for missing feature)', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      loadStartMs: BASE + 5,
      loadEndMs: BASE + 25,
      scoreStartMs: BASE + 30,
      scoreEndMs: BASE + 60,
      executeStartMs: BASE + 65,
      executeEndMs: BASE + 165,
    };
    const result = aggregateCost(markers, BASE + 200) as PipelineTimings & {
      roleCosts?: Record<string, number>;
    };
    expect(result.roleCosts).toBeDefined();
    expect(result.roleCosts?.load).toBe(20);
    expect(result.roleCosts?.score).toBe(30);
    expect(result.roleCosts?.execute).toBe(100);
  });

  it('records retry counts via repeated executeStart markers (Red for missing feature)', () => {
    const markers: TimingMarkers = {
      pipelineStartMs: BASE,
      executeStartMs: BASE + 10,
      executeEndMs: BASE + 50,
    };
    const result = aggregateCost(markers, BASE + 60) as PipelineTimings & {
      retryCount?: number;
    };
    expect(result.retryCount).toBe(0);
  });
});
