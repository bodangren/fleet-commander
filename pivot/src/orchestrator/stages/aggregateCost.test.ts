import { describe, expect, it } from 'bun:test';
import { aggregateCost, type TimingMarkers } from './aggregateCost';

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
});
